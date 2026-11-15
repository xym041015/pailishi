<script setup lang="ts">
import { type EngineSettings, loadEngineSettings, saveEngineSettings, getActiveCloudProvider } from '../utils/cloudOCR'
import { buildLatexPreview, segsForRange } from '../utils/latexSegments'

type AutoCopyMode = 'off' | 'latex' | 'mathml'

const { t } = useI18n()
const toast = useToast()

const DRAFT_KEY = 'pailishi-draft'

const latexCode = ref('')
const imageFile = ref<File | null>(null)
const imageUrl = ref<string | null>(null)
const imageDims = ref<{ width: number, height: number } | null>(null)
const flash = ref(false)
const showLightbox = ref(false)
const showHelp = ref(false)
const showInsert = ref(false)
const showGuide = ref(false)
const showSettings = ref(false)

const engineSettings = ref<EngineSettings>(loadEngineSettings())

// 复制/导出动作与识别路由抽为共享 composable（/write 手写板页复用），行为与原内联实现一致
const formula = useFormulaActions(() => latexCode.value, t)
const { exporting } = formula
const recognizer = useRecognize({ t, toast })
const { recognizing, confidenceValue } = recognizer

function onSettingsSave(settings: EngineSettings) {
  engineSettings.value = settings
  saveEngineSettings(settings)
}
const sourceFont = ref(14)
const previewFont = ref(17)
const autoCopy = ref<AutoCopyMode>('latex')

const fileInput = ref<HTMLInputElement | null>(null)

const hasWork = computed(() => !!imageFile.value || !!latexCode.value)

// 源码选区 ↔ 预览高亮联动：把源码切段打 seg 标记，选中时算命中片段
const sourceSel = ref<{ start: number, end: number } | null>(null)
const previewBuild = computed(() => buildLatexPreview(latexCode.value))
const previewCode = computed(() => previewBuild.value.wrapped)
const activeSegs = computed(() => {
  const sel = sourceSel.value
  if (!sel || sel.end <= sel.start) return [] as number[]
  return segsForRange(previewBuild.value.units, sel.start, sel.end)
})

function onSourceSelect(start: number, end: number) {
  sourceSel.value = { start, end }
}

watch(latexCode, () => {
  sourceSel.value = null
})

const warning = computed(() => {
  if (!imageDims.value) return null
  const { width, height } = imageDims.value
  const min = Math.min(width, height)
  const max = Math.max(width, height)
  if (min < 384) return t('warn_small_image')
  if (max / min > 3) return t('warn_ratio')
  return null
})

// ---- undo / redo（源码区文字级历史栈） ----
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)
let suppressHistoryWatch = false
let historyTimer: ReturnType<typeof setTimeout> | undefined

watch(latexCode, (_val, old) => {
  if (suppressHistoryWatch) {
    suppressHistoryWatch = false
    return
  }
  if (historyTimer) clearTimeout(historyTimer)
  historyTimer = setTimeout(() => {
    if (old !== undefined) undoStack.value.push(old)
    if (undoStack.value.length > 100) undoStack.value.shift()
    redoStack.value = []
  }, 400)
})

function undo() {
  const prev = undoStack.value.pop()
  if (prev === undefined) return
  redoStack.value.push(latexCode.value)
  suppressHistoryWatch = true
  latexCode.value = prev
}

function redo() {
  const next = redoStack.value.pop()
  if (next === undefined) return
  undoStack.value.push(latexCode.value)
  suppressHistoryWatch = true
  latexCode.value = next
}

// ---- 草稿仅保存在本浏览器（状态条文案的现实依据） ----
let draftTimer: ReturnType<typeof setTimeout> | undefined

watch(latexCode, (val) => {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    if (!import.meta.client) return
    if (val) localStorage.setItem(DRAFT_KEY, val)
    else localStorage.removeItem(DRAFT_KEY)
  }, 600)
})

async function maybeAutoCopy() {
  if (autoCopy.value === 'latex') await formula.copyLatex()
  else if (autoCopy.value === 'mathml') await formula.copyWordFormula()
}

// ---- 识别流程 ----
// 识别路由（云端/本地引擎）在 useRecognize 内；本页 wrapper 负责：
// 本地路由前的 svg→png 转换（粘贴 svg 场景，云端路由直接吃原文件）、
// 结果写入源码区、成功后按 autoCopy 设置自动复制
async function runOCR(file: File) {
  let input = file
  if (input.type === 'image/svg+xml' && !getActiveCloudProvider(engineSettings.value)) {
    try {
      input = await convertSvgToPng(input)
    } catch (err) {
      // 转换失败发生在 useRecognize 之前（'predict' toast 尚未建立，无处 update），
      // 需自行弹失败反馈，否则损坏/伪造 mime 的 svg 会变成无提示的未处理 rejection
      toast.add({ title: t('recognize_failed') + ` ${err instanceof Error ? err.message : String(err)}`, color: 'error', duration: 0 })
      return
    }
  }
  try {
    latexCode.value = await recognizer.runOCR(input, engineSettings.value)
    await maybeAutoCopy()
  } catch {
    // 失败 toast 已在 useRecognize 内更新；这里吞掉 rethrow 避免未处理 rejection
  }
}

function clearWorkbench() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageFile.value = null
  imageUrl.value = null
  imageDims.value = null
  latexCode.value = ''
  undoStack.value = []
  redoStack.value = []
  if (import.meta.client) localStorage.removeItem(DRAFT_KEY)
}

function recapture() {
  if (imageFile.value) runOCR(imageFile.value)
}

function insertFormula(code: string, display: boolean) {
  const snippet = display ? `$$${code}$$` : `$${code}$`
  latexCode.value = latexCode.value ? `${latexCode.value}\n${snippet}` : snippet
}

// ---- 模块 3：截图识别——引导用户用系统截图快捷键截进剪贴板，粘贴自动识别。
// 不使用 getDisplayMedia：浏览器强制的"共享屏幕"授权弹窗体验差（用户实测否决）。 ----

function openFilePicker() {
  fileInput.value?.click()
}

function onActivateOriginal() {
  if (imageUrl.value) showLightbox.value = true
  else openFilePicker()
}

async function setImageMeta(file: File) {
  try {
    const bmp = await createImageBitmap(file)
    imageDims.value = { width: bmp.width, height: bmp.height }
    console.log(`[拍立式] 原图 ${bmp.width}×${bmp.height} → 模型输入 384×384（imageProcessor.resize 固定输出，白底居中补边已内置）`)
    bmp.close()
  } catch {
    imageDims.value = null
  }
}

function triggerFlash() {
  flash.value = true
  setTimeout(() => {
    flash.value = false
  }, 350)
}

async function handleImage(file: File) {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageFile.value = file
  imageUrl.value = URL.createObjectURL(file)
  triggerFlash()
  await setImageMeta(file)
  await runOCR(file)
}

const loadTestImage = (() => {
  let idx = 0
  // 绝对路径：页面在 /ocr/ 路由下，相对路径会拼成 /ocr/assets/... 导致 404
  const urls = [
    '/assets/test_img/单行公式.png',
    '/assets/test_img/单行公式2.png',
    '/assets/test_img/多行公式.png',
    '/assets/test_img/多行公式2.jpg'
  ]

  return async function () {
    const response = await fetch(urls[idx]!)
    const blob = await response.blob()
    await handleImage(new File([blob], 'test-image.jpg', { type: blob.type }))
    idx = (idx + 1) % urls.length
  }
})()

// 处理全局粘贴事件
const handlePaste = async (event: ClipboardEvent) => {
  if (!import.meta.client) return
  const target = event.target as HTMLElement
  if (
    target.tagName === 'TEXTAREA'
    || target.tagName === 'INPUT'
    || target.isContentEditable
  ) {
    return
  }

  const items = event.clipboardData?.items
  if (!items || items.length === 0) return

  const item = items[0]!
  if (item.type.indexOf('image') !== -1) {
    event.preventDefault()
    const file = item.getAsFile()
    if (file) {
      const timestamp = new Date().getTime()
      await handleImage(new File([file], `pasted-image-${timestamp}.png`, { type: file.type }))
    }
  }
}

// 在客户端挂载后初始化
onMounted(async () => {
  // 恢复草稿
  const saved = localStorage.getItem(DRAFT_KEY)
  if (saved) latexCode.value = saved

  window.addEventListener('paste', handlePaste)

  const model_config = await useSource()
  useModelLoadingToast(t, model_config, recognizer.progress, recognizer.isReady)
  await recognizer.loadModel(model_config)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', handlePaste)
})
</script>

<template>
  <div class="relative z-10 mx-auto flex min-h-full w-full max-w-[1500px] flex-col px-4 pb-24 md:pb-4">
    <InputBand
      class="mb-5"
      :has-image="!!imageFile"
      :has-content="hasWork"
      :recognizing="recognizing"
      @capture="showGuide = true"
      @settings="showSettings = true"
      @recapture="recapture"
      @clear="clearWorkbench"
    />

    <div class="grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[0.9fr_1.1fr_1.1fr]">
      <PanelOriginal
        class="min-w-0 md:col-start-1 md:row-start-1"
        :src="imageUrl"
        :recognizing="recognizing"
        :flash="flash"
        :warning="warning"
        @activate="onActivateOriginal"
        @example="loadTestImage()"
        @drop-file="handleImage"
      />

      <PanelPreview
        class="min-w-0 md:col-start-1 md:row-start-2 xl:col-start-3 xl:row-start-1"
        :code="latexCode"
        :wrapped-code="previewCode"
        :highlight-segs="activeSegs"
        :font-size="previewFont"
        @update:code="latexCode = $event"
        @font-plus="previewFont = Math.min(28, previewFont + 2)"
        @font-minus="previewFont = Math.max(14, previewFont - 2)"
      />

      <PanelSource
        class="min-w-0 md:col-start-2 md:row-span-2 md:row-start-1 xl:col-start-2 xl:row-span-1"
        :code="latexCode"
        :font-size="sourceFont"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :auto-copy="autoCopy"
        :exporting="exporting"
        :confidence="confidenceValue"
        @update:code="latexCode = $event"
        @update:auto-copy="autoCopy = $event"
        @copy-word="formula.copyWordFormula"
        @copy-latex="formula.copyLatex"
        @export-docx="formula.exportDocx"
        @insert="showInsert = true"
        @font-plus="sourceFont = Math.min(24, sourceFont + 1)"
        @font-minus="sourceFont = Math.max(12, sourceFont - 1)"
        @undo="undo"
        @redo="redo"
        @help="showHelp = true"
        @select-range="onSourceSelect"
      />
    </div>

    <StatusBar class="mt-3" />

    <!-- 移动端吸底主按钮 -->
    <div class="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--pk-line)] bg-[var(--pk-panel)] p-3 md:hidden">
      <button
        type="button"
        class="pk-btn pk-btn-solid pk-btn-block"
        :disabled="!latexCode"
        @click="formula.copyWordFormula"
      >
        <UIcon
          name="i-lucide-aperture"
          class="h-4 w-4"
        />
        {{ t('copy_word_formula') }}
      </button>
    </div>

    <UModal
      v-model:open="showLightbox"
      :title="t('panel_original')"
    >
      <template #body>
        <div class="flex items-center justify-center">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            alt="original formula"
            class="max-h-[75vh] max-w-full object-contain"
          >
        </div>
      </template>
    </UModal>

    <HelpDrawer v-model:open="showHelp" />

    <InsertFormulaDialog
      v-model:open="showInsert"
      @insert="insertFormula"
    />

    <ScreenshotGuideModal v-model:open="showGuide" />

    <FirstVisitGuide />

    <SettingsDrawer
      v-model:open="showSettings"
      :settings="engineSettings"
      @save="onSettingsSave"
    />

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="(e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) handleImage(file)
        ;(e.target as HTMLInputElement).value = ''
      }"
    >
  </div>
</template>
