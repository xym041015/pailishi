<script setup lang="ts">
import type { ModelConfig } from '../composables/types'
import { convertToMathML, formatLatex, orthographyToLaTeX } from '../composables/textProcessor'
// docxExport 改为 exportDocx 内动态加载（客户端专用依赖，见下方注释）
import {
  type EngineSettings,
  loadEngineSettings,
  saveEngineSettings,
  getActiveCloudProvider,
  recognizeWithProvider
} from '../utils/cloudOCR'

type AutoCopyMode = 'off' | 'latex' | 'mathml'

const { t } = useI18n()
const toast = useToast()

const DRAFT_KEY = 'pailishi-draft'

const latexCode = ref('')
const imageFile = ref<File | null>(null)
const imageUrl = ref<string | null>(null)
const imageDims = ref<{ width: number, height: number } | null>(null)
const recognizing = ref(false)
const flash = ref(false)
const showLightbox = ref(false)
const showHelp = ref(false)
const showInsert = ref(false)
const showGuide = ref(false)
const showSettings = ref(false)

const engineSettings = ref<EngineSettings>(loadEngineSettings())
const confidenceValue = ref<number | null>(null)

function onSettingsSave(settings: EngineSettings) {
  engineSettings.value = settings
  saveEngineSettings(settings)
}
const sourceFont = ref(14)
const previewFont = ref(17)
const autoCopy = ref<AutoCopyMode>('latex')

const fileInput = ref<HTMLInputElement | null>(null)

const hasWork = computed(() => !!imageFile.value || !!latexCode.value)

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

// ---- 复制 ----
async function copyLatex() {
  try {
    await navigator.clipboard.writeText(latexCode.value)
    toast.add({ title: t('copy_latex') + ' ' + t('copied'), color: 'success', duration: 1500 })
  } catch (err) {
    console.log(err)
    toast.add({ title: t('copy_failed'), description: String(err), color: 'error', duration: 0 })
  }
}

// 模块 2：剪贴板双 flavor。Word 在 text/html 与 text/plain 并存时优先吃 text/html，
// 把 MathML 包进完整 HTML 文档；纯文本目标（输入框/聊天窗）则吃到 text/plain 的 LaTeX 源码。
// Safari 要求 clipboard.write() 处在用户手势同步栈内（WebKit 222262）——MathML 全部同步算好，只在最后 await 一次。
async function copyWordFormula() {
  const latex = latexCode.value
  if (!latex) return

  let mathml = convertToMathML(latex)
  if (mathml.startsWith('<math') && !mathml.includes('xmlns=')) {
    mathml = mathml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"')
  }
  const html = `<html><body>${mathml}</body></html>`

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([latex], { type: 'text/plain' })
      })
    ])
    toast.add({ title: t('copied_word_hint'), color: 'success', duration: 2000 })
  } catch {
    // 旧浏览器 / 权限拒绝时退回纯文本 LaTeX——比裸 MathML 在纯文本目标里有用得多
    try {
      await navigator.clipboard.writeText(latex)
      toast.add({ title: t('copied_word_hint'), color: 'success', duration: 2000 })
    } catch (err) {
      console.log(err)
      toast.add({ title: t('copy_failed'), description: String(err), color: 'error', duration: 0 })
    }
  }
}

async function maybeAutoCopy() {
  if (autoCopy.value === 'latex') await copyLatex()
  else if (autoCopy.value === 'mathml') await copyWordFormula()
}

// ---- 模块 4：浏览器端 .docx 导出 ----
const exporting = ref(false)

async function exportDocx() {
  if (!latexCode.value || exporting.value) return
  exporting.value = true
  try {
    // 客户端动态加载：docx 依赖链（whatwg-url → punycode）不能进 SSR 包，
    // 否则 Nitro cloudflare 预设的 unenv shim 会报 ENOTDIR
    const { latexToDocxBlob, downloadBlob } = await import('../utils/docxExport')
    const blob = await latexToDocxBlob(latexCode.value)
    downloadBlob(blob, `拍立式-公式-${Date.now()}.docx`)
    toast.add({ title: t('export_success'), color: 'success', duration: 2000 })
  } catch (err) {
    console.log(err)
    toast.add({ title: t('export_failed'), description: String(err), color: 'error', duration: 0 })
  } finally {
    exporting.value = false
  }
}

// ---- 识别流程 ----
let load: (model_config: ModelConfig) => Promise<void>
let runOCR: (file: File) => Promise<void>

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
  const urls = [
    'assets/test_img/单行公式.png',
    'assets/test_img/单行公式2.png',
    'assets/test_img/多行公式.png',
    'assets/test_img/多行公式2.jpg'
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

  const { init, predict, isReady, progress } = useOCR()

  load = async (model_config: ModelConfig) => {
    await init(model_config)
  }

  runOCR = async (file: File) => {
    recognizing.value = true
    confidenceValue.value = null
    toast.clear()
    toast.add({
      id: 'predict',
      title: t('focus_recognizing'),
      color: 'info',
      duration: 0
    })

    const start = performance.now()

    try {
      let output = ''
      let confidence: number | null = null

      // 模块 5：供应商路由——没填 key 或选本地时走本地模型，零拦截
      const cloudProvider = getActiveCloudProvider(engineSettings.value)
      if (cloudProvider) {
        const cloud = await recognizeWithProvider(cloudProvider, file)
        output = cloud.latex
        confidence = cloud.confidence
      } else {
        let input = file
        if (input.type === 'image/svg+xml') {
          input = await convertSvgToPng(input)
        }
        const result = await predict(input)
        if (result.status !== 'result') {
          throw new Error(result.output || t('unknown_error'))
        }
        output = result.output || ''
      }

      const elapsedMs = performance.now() - start
      const timeStr = elapsedMs < 1000 ? `${Math.round(elapsedMs)} ms` : `${(elapsedMs / 1000).toFixed(2)} s`

      latexCode.value = orthographyToLaTeX(formatLatex(output))
      confidenceValue.value = confidence
      toast.update('predict', {
        title: t('recognize_success') + ' ' + timeStr,
        color: 'success',
        duration: 1500
      })
      await maybeAutoCopy()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.update('predict', {
        title: t('recognize_failed') + ` ${message}`,
        color: 'error',
        duration: 0
      })
    } finally {
      recognizing.value = false
    }
  }

  window.addEventListener('paste', handlePaste)

  const model_config = await useSource()
  useModelLoadingToast(t, model_config, progress, isReady)
  await load(model_config)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', handlePaste)
})
</script>

<template>
  <div class="relative z-10 mx-auto flex min-h-full w-full max-w-[1500px] flex-col px-4 pb-24 pt-4 md:pb-4">
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
        @copy-word="copyWordFormula"
        @copy-latex="copyLatex"
        @export-docx="exportDocx"
        @insert="showInsert = true"
        @font-plus="sourceFont = Math.min(24, sourceFont + 1)"
        @font-minus="sourceFont = Math.max(12, sourceFont - 1)"
        @undo="undo"
        @redo="redo"
        @help="showHelp = true"
      />
    </div>

    <StatusBar class="mt-3" />

    <!-- 移动端吸底主按钮 -->
    <div class="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--pk-line)] bg-[var(--pk-panel)] p-3 md:hidden">
      <button
        type="button"
        class="pk-btn pk-btn-solid pk-btn-block"
        :disabled="!latexCode"
        @click="copyWordFormula"
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
