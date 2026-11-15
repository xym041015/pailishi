<script setup lang="ts">
import HandwritingBoard from '../components/HandwritingBoard.vue'
import {
  type EngineSettings,
  loadEngineSettings,
  saveEngineSettings,
  getActiveCloudProvider,
  PROVIDER_PRESETS,
  customProviderName
} from '../utils/cloudOCR'

type AutoCopyMode = 'off' | 'latex' | 'mathml'

const { t } = useI18n()
const toast = useToast()

const board = ref<InstanceType<typeof HandwritingBoard> | null>(null)
const boardEmpty = ref(true)
const latexCode = ref('')
const showSettings = ref(false)

const engineSettings = ref<EngineSettings>(loadEngineSettings())

// 识别路由（云端优先/本地兜底）与复制导出动作复用 Task 3 的共享 composable，
// 与 /ocr 行为一致；useOCR 已在 useRecognize 内部调用，页面只消费 isReady/progress
const recognizer = useRecognize({ t, toast })
const { recognizing, confidenceValue, runOCR } = recognizer
const { exporting, copyLatex, copyWordFormula, exportDocx } = useFormulaActions(() => latexCode.value, t)

// 源码与预览共用一档字号（手写页无分栏字号微调需求）
const fontSize = ref(28)
const autoCopy = ref<AutoCopyMode>('off')

// 引擎 pill：没配云端供应商（或没填 key）→ 本地模型；显示名与 SettingsDrawer 同源
// （预设用 label，自定义用 config.name，兜底 customProviderName）
const cloudName = computed(() => {
  const provider = getActiveCloudProvider(engineSettings.value)
  if (!provider) return ''
  return provider.config.name
    || PROVIDER_PRESETS.find(p => p.id === provider.id)?.label
    || customProviderName(provider.id)
})
const isLocal = computed(() => !cloudName.value)

// SettingsDrawer 保存后整体替换 settings，cloudName/isLocal 随 computed 自动刷新
function onSettingsSave(settings: EngineSettings) {
  engineSettings.value = settings
  saveEngineSettings(settings)
}

// 模型加载链与 ocr.vue onMounted 完全一致：探测源 → 进度 toast → init
onMounted(async () => {
  const model_config = await useSource()
  useModelLoadingToast(t, model_config, recognizer.progress, recognizer.isReady)
  await recognizer.loadModel(model_config)
})

async function maybeAutoCopy() {
  if (autoCopy.value === 'latex') await copyLatex()
  else if (autoCopy.value === 'mathml') await copyWordFormula()
}

async function recognize() {
  const blob = await board.value?.exportPng()
  if (!blob) return
  try {
    const out = await runOCR(new File([blob], `handwritten-${Date.now()}.png`, { type: 'image/png' }), engineSettings.value)
    if (!out.trim()) throw new Error(t('write_empty_result'))
    latexCode.value = out
    await maybeAutoCopy()
  } catch (err) {
    // 识别失败 toast 已在 useRecognize 内统一弹出，这里吞掉 rethrow 防未处理 rejection。
    // 唯一例外：空结果——runOCR 对空串是「成功返回」（内部 toast 已变成「识别成功」），
    // 空判定发生在页面侧，spec §7 要求此时补一条「未识别出内容」的失败提示；
    // 用消息比对区分两种来源，真正的识别失败不会二次弹 toast
    if (err instanceof Error && err.message === t('write_empty_result')) {
      toast.add({ title: t('write_empty_result'), color: 'error', duration: 0 })
    }
  }
}
</script>

<template>
  <div class="relative z-10 mx-auto flex min-h-full w-full max-w-[860px] flex-col gap-4 px-4 pb-24 md:pb-4">
    <!-- 页内标题 + 图注（备课纸图注式说明） -->
    <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h1 class="pk-serif text-xl font-bold text-[var(--pk-ink)]">
        {{ t('nav_write') }}
      </h1>
      <p class="text-xs text-[var(--pk-muted)]">
        {{ t('write_caption') }}
      </p>
    </header>

    <!-- 画板（工具条内置于组件）：空态变化经 change 同步给识别按钮 -->
    <section class="pk-panel">
      <HandwritingBoard
        ref="board"
        @change="boardEmpty = $event"
      />
    </section>

    <!-- 识别按钮行 + 引擎 pill -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        class="pk-btn pk-btn-solid"
        :disabled="boardEmpty || recognizing"
        @click="recognize"
      >
        <UIcon
          name="i-lucide-scan-text"
          class="h-4 w-4"
          :class="{ 'animate-pulse': recognizing }"
        />
        {{ t('write_recognize') }}
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--pk-primary)] hover:text-[var(--pk-primary)]"
        :aria-label="t('write_engine_label')"
        @click="showSettings = true"
      >
        <UIcon
          :name="isLocal ? 'i-lucide-cpu' : 'i-lucide-cloud'"
          class="h-3.5 w-3.5"
        />
        <span class="font-semibold text-[var(--pk-ink)]">{{ t('write_engine_label') }}</span>
        <span>{{ isLocal ? t('write_engine_local') : cloudName }}</span>
      </button>
    </div>

    <!-- 本地引擎黄条：荧光笔黄淡底，常驻不自动消失（spec §4.4） -->
    <div
      v-if="latexCode && isLocal"
      class="flex items-start gap-2 rounded-md border border-[var(--pk-highlight)] bg-[var(--pk-highlight-soft)] px-3 py-2 text-xs leading-5 text-[var(--pk-ink)]"
      role="note"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="mt-0.5 h-3.5 w-3.5 shrink-0"
      />
      <span>{{ t('write_local_notice') }}</span>
    </div>

    <!-- 结果两栏：移动端单列，md 起左源码右预览 -->
    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
      <!-- 手写页无源码撤销栈（撤销在画板内），canUndo/canRedo 恒 false -->
      <PanelSource
        class="min-w-0"
        :code="latexCode"
        :font-size="fontSize"
        :can-undo="false"
        :can-redo="false"
        :auto-copy="autoCopy"
        :exporting="exporting"
        :confidence="confidenceValue"
        @update:code="latexCode = $event"
        @update:auto-copy="autoCopy = $event"
        @copy-word="copyWordFormula"
        @copy-latex="copyLatex"
        @export-docx="exportDocx"
        @font-plus="fontSize = Math.min(40, fontSize + 2)"
        @font-minus="fontSize = Math.max(14, fontSize - 2)"
      />

      <PanelPreview
        class="min-w-0"
        :code="latexCode"
        :font-size="fontSize"
        @update:code="latexCode = $event"
        @font-plus="fontSize = Math.min(40, fontSize + 2)"
        @font-minus="fontSize = Math.max(14, fontSize - 2)"
      />
    </div>

    <SettingsDrawer
      v-model:open="showSettings"
      :settings="engineSettings"
      @save="onSettingsSave"
    />
  </div>
</template>
