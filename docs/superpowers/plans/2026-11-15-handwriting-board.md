# 手写板模式（/write）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 /write 手写板页——canvas 手写公式 → 现有识别管线 → LaTeX/预览/复制进 Word，本地引擎默认、云端一键对照。

**Architecture:** 纯逻辑（笔画栈）抽成可测的 `useStrokes.ts`；canvas 渲染收进 `HandwritingBoard.vue`；识别动作从 ocr.vue 抽成 `useFormulaActions.ts` + `useRecognize.ts` 两个 composable 供 /ocr 与 /write 共用；新页 write.vue 组装。管线本身零改动。

**Tech Stack:** Nuxt 3 + @nuxt/ui（pk-* token）、@huggingface/transformers（既有）、vitest（新增 devDep，纯逻辑单测）、image-js（既有预处理）。

**Spec:** `docs/superpowers/specs/2026-11-15-handwriting-board-design.md`

## Global Constraints

- 所有视觉走 pk-* token（`--pk-primary #2b5c8f`、`--pk-highlight #f6e27a`、宋体 `pk-serif`）；不引入新风格
- 画板永远白底黑笔画（深色模式也不例外——画板是纸）
- 不拦截原则：云端未配置时识别按钮照常可用（本地引擎）
- docx 依赖必须客户端动态 `await import('../utils/docxExport')`（ENOTDIR 坑）
- i18n：zh-CN.json / en.json 成对新增
- `nitro.prerender.routes` 必须显式包含新路由（CF 爬虫坑）
- 提交信息中文，`git push` 失败重试（已知网络抖动，最多 8 次、退避递增）
- 部署前本地 `pnpm run generate` 全量验证 + 全站 curl（/、/ocr/、/guide/、/write/ 铁律）

---

### Task 1: vitest 测试基建

**Files:**
- Modify: `package.json`（scripts.test + devDependencies）
- Create: `vitest.config.ts`
- Create: `app/composables/__tests__/smoke.test.ts`

**Interfaces:** Produces: `npm test` 命令可用；后续任务的 `*.test.ts` 均被同一配置拾取（glob `app/**/*.test.ts`）。

- [ ] **Step 1: 安装依赖**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: 写配置与冒烟测试**

`vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['app/**/*.test.ts'],
    environment: 'node'
  }
})
```

`package.json` scripts 增加：`"test": "vitest run"`。

`app/composables/__tests__/smoke.test.ts`：

```ts
import { describe, it, expect } from 'vitest'

describe('vitest 基建', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: 跑测试**

Run: `pnpm test`
Expected: 1 passed

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts app/composables/__tests__/smoke.test.ts
git commit -m "测试基建：vitest + 冒烟测试"
```

---

### Task 2: useStrokes.ts 笔画栈纯逻辑（TDD）

**Files:**
- Create: `app/composables/useStrokes.ts`
- Create: `app/composables/__tests__/useStrokes.test.ts`

**Interfaces:** Produces（Task 4 依赖，签名固定）:

```ts
export interface Point { x: number; y: number }
export interface Stroke { points: Point[]; width: number }
export interface StrokesApi {
  strokes: Ref<Stroke[]>          // 已提交笔画（响应式，供重绘）
  current: Ref<Stroke | null>     // 进行中笔画
  isEmpty: ComputedRef<boolean>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  startStroke(pt: Point, width: number): void
  addPoint(pt: Point): void
  endStroke(): void
  undo(): void
  redo(): void
  clear(): void
  eraseAt(pt: Point, radius: number): boolean  // 命中任一笔画则删整笔并返回 true
}
export function useStrokes(): StrokesApi
```

- [ ] **Step 1: 写失败测试**

`app/composables/__tests__/useStrokes.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { useStrokes } from '../useStrokes'

describe('useStrokes', () => {
  it('start/add/end 构建一笔', () => {
    const s = useStrokes()
    s.startStroke({ x: 0, y: 0 }, 6)
    s.addPoint({ x: 10, y: 10 })
    s.addPoint({ x: 20, y: 20 })
    s.endStroke()
    expect(s.strokes.value.length).toBe(1)
    expect(s.strokes.value[0].points.length).toBe(3)
    expect(s.strokes.value[0].width).toBe(6)
    expect(s.isEmpty.value).toBe(false)
  })

  it('undo/redo 往返', () => {
    const s = useStrokes()
    s.startStroke({ x: 0, y: 0 }, 6); s.endStroke()
    s.startStroke({ x: 1, y: 1 }, 3); s.endStroke()
    expect(s.strokes.value.length).toBe(2)
    s.undo()
    expect(s.strokes.value.length).toBe(1)
    expect(s.canUndo.value).toBe(true)
    expect(s.canRedo.value).toBe(true)
    s.redo()
    expect(s.strokes.value.length).toBe(2)
    expect(s.canRedo.value).toBe(false)
  })

  it('clear 清空且撤销栈随之清空', () => {
    const s = useStrokes()
    s.startStroke({ x: 0, y: 0 }, 6); s.endStroke()
    s.clear()
    expect(s.isEmpty.value).toBe(true)
    expect(s.canUndo.value).toBe(false)
    expect(s.canRedo.value).toBe(false)
  })

  it('eraseAt 命中删整笔、未命中返回 false', () => {
    const s = useStrokes()
    s.startStroke({ x: 0, y: 0 }, 6)
    s.addPoint({ x: 50, y: 0 })
    s.endStroke()
    s.startStroke({ x: 200, y: 200 }, 6); s.endStroke()
    expect(s.eraseAt({ x: 25, y: 3 }, 10)).toBe(true)   // 命中第一笔
    expect(s.strokes.value.length).toBe(1)
    expect(s.eraseAt({ x: 999, y: 999 }, 5)).toBe(false)
    expect(s.strokes.value.length).toBe(1)
  })

  it('endStroke 空笔画不提交', () => {
    const s = useStrokes()
    s.startStroke({ x: 0, y: 0 }, 6)
    s.endStroke()
    expect(s.strokes.value.length).toBe(0)  // 单点也视为空笔画（点击不落墨）
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test`
Expected: FAIL（useStrokes 不存在）

- [ ] **Step 3: 实现**

`app/composables/useStrokes.ts`：

```ts
import { computed, ref, type ComputedRef, type Ref } from 'vue'

export interface Point { x: number; y: number }
export interface Stroke { points: Point[]; width: number }
export interface StrokesApi {
  strokes: Ref<Stroke[]>
  current: Ref<Stroke | null>
  isEmpty: ComputedRef<boolean>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  startStroke(pt: Point, width: number): void
  addPoint(pt: Point): void
  endStroke(): void
  undo(): void
  redo(): void
  clear(): void
  eraseAt(pt: Point, radius: number): boolean
}

export function useStrokes(): StrokesApi {
  const strokes = ref<Stroke[]>([])
  const redoStack = ref<Stroke[]>([])
  const current = ref<Stroke | null>(null)

  const isEmpty = computed(() => strokes.value.length === 0)
  const canUndo = computed(() => strokes.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function startStroke(pt: Point, width: number) {
    current.value = { points: [pt], width }
  }
  function addPoint(pt: Point) {
    current.value?.points.push(pt)
  }
  function endStroke() {
    if (!current.value) return
    // 单点（点击）不落墨
    if (current.value.points.length >= 2) {
      strokes.value.push(current.value)
      redoStack.value = []
    }
    current.value = null
  }
  function undo() {
    const s = strokes.value.pop()
    if (s) redoStack.value.push(s)
  }
  function redo() {
    const s = redoStack.value.pop()
    if (s) strokes.value.push(s)
  }
  function clear() {
    strokes.value = []
    redoStack.value = []
    current.value = null
  }
  function dist2(a: Point, b: Point) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
  }
  function eraseAt(pt: Point, radius: number): boolean {
    const r2 = radius * radius
    const idx = strokes.value.findIndex(st =>
      st.points.some(p => dist2(p, pt) <= r2)
    )
    if (idx === -1) return false
    strokes.value.splice(idx, 1)
    redoStack.value = []
    return true
  }
  return { strokes, current, isEmpty, canUndo, canRedo, startStroke, addPoint, endStroke, undo, redo, clear, eraseAt }
}
```

- [ ] **Step 4: 跑测试通过**

Run: `pnpm test`
Expected: PASS（useStrokes 5 例 + smoke 1 例）

- [ ] **Step 5: Commit**

```bash
git add app/composables/useStrokes.ts app/composables/__tests__/useStrokes.test.ts
git commit -m "手写板笔画栈纯逻辑 useStrokes（TDD）"
```

---

### Task 3: 抽取 useFormulaActions + useRecognize（ocr.vue 改接，行为不变）

**Files:**
- Create: `app/composables/useFormulaActions.ts`
- Create: `app/composables/useRecognize.ts`
- Modify: `app/pages/ocr.vue`（删除三个本地函数与识别路由块，改接 composable）

**Interfaces:** Consumes: `utils/docxExport`（动态 import）、`composables/OCR.ts`（useOCR）、`composables/cloudOCR.ts`（getActiveCloudProvider/recognizeWithProvider/loadEngineSettings）、`composables/textProcessor.ts`（formatLatex/orthographyToLaTeX）。Produces（write.vue 依赖）:

```ts
// useFormulaActions
export function useFormulaActions(getLatex: () => string, t: (k: string) => string): {
  exporting: Ref<boolean>
  copyLatex(): Promise<void>
  copyWordFormula(): Promise<void>
  exportDocx(): Promise<void>
}

// useRecognize
export function useRecognize(options: {
  t: (k: string) => string
  toast: ReturnType<typeof useToast>
}): {
  recognizing: Ref<boolean>
  confidenceValue: Ref<number | null>
  runOCR(file: File, engineSettings: EngineSettings): Promise<string>  // 返回格式化后的 LaTeX，失败 throw
}
```

- [ ] **Step 1: 实现 useFormulaActions.ts**

```ts
import { ref, type Ref } from 'vue'
import type { useToast } from '@nuxt/ui'

// 从 ocr.vue 原样迁移（2026-11-15）：双 flavor 剪贴板 + LaTeX 复制 + docx 导出
export function useFormulaActions(getLatex: () => string, t: (k: string) => string) {
  const toast = useToast()
  const exporting = ref(false)

  async function copyLatex() {
    try {
      await navigator.clipboard.writeText(getLatex())
      toast.add({ title: t('copy_latex') + ' ' + t('copied'), color: 'success', duration: 1500 })
    } catch (err) {
      console.log(err)
      toast.add({ title: t('copy_failed'), description: String(err), color: 'error', duration: 0 })
    }
  }

  // Word 在 text/html 与 text/plain 并存时优先吃 text/html（MathML），纯文本目标吃 LaTeX
  async function copyWordFormula() {
    const latex = getLatex()
    if (!latex) return
    const { convertToMathML } = await import('../composables/textProcessor')
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
      try {
        await navigator.clipboard.writeText(latex)
        toast.add({ title: t('copied_word_hint'), color: 'success', duration: 2000 })
      } catch (err) {
        console.log(err)
        toast.add({ title: t('copy_failed'), description: String(err), color: 'error', duration: 0 })
      }
    }
  }

  async function exportDocx() {
    if (!getLatex() || exporting.value) return
    exporting.value = true
    try {
      const { latexToDocxBlob, downloadBlob } = await import('../utils/docxExport')
      const blob = await latexToDocxBlob(getLatex())
      downloadBlob(blob, `拍立式-公式-${Date.now()}.docx`)
      toast.add({ title: t('export_success'), color: 'success', duration: 2000 })
    } catch (err) {
      console.log(err)
      toast.add({ title: t('export_failed'), description: String(err), color: 'error', duration: 0 })
    } finally {
      exporting.value = false
    }
  }

  return { exporting, copyLatex, copyWordFormula, exportDocx } as {
    exporting: Ref<boolean>
    copyLatex: () => Promise<void>
    copyWordFormula: () => Promise<void>
    exportDocx: () => Promise<void>
  }
}
```

（实现时以 ocr.vue 现行代码为准逐字迁移——包括 convertToMathML 的 import 路径，ocr.vue 现为静态 `import { convertToMathML, formatLatex, orthographyToLaTeX } from '../composables/textProcessor'`，抽取后 copyWordFormula 内改为动态 import 亦可，保持一致即可。）

- [ ] **Step 2: 实现 useRecognize.ts**

```ts
import { ref, type Ref } from 'vue'
import type { useToast } from '@nuxt/ui'
import { useOCR } from './OCR'
import { getActiveCloudProvider, recognizeWithProvider, type EngineSettings } from './cloudOCR'
import { formatLatex, orthographyToLaTeX } from './textProcessor'
import type { ModelConfig } from './types'

// 从 ocr.vue 原样迁移的识别路由：云端优先（填了 key），否则本地模型；零拦截
export function useRecognize(options: { t: (k: string) => string; toast: ReturnType<typeof useToast> }) {
  const { t, toast } = options
  const recognizing = ref(false)
  const confidenceValue: Ref<number | null> = ref(null)

  const { init, predict, isReady, progress } = useOCR()
  let load: (model_config: ModelConfig) => Promise<void> = async () => {}
  async function loadModel(model_config: ModelConfig) {
    load = async (mc: ModelConfig) => { await init(mc) }
    await load(model_config)
  }

  async function runOCR(file: File, engineSettings: EngineSettings): Promise<string> {
    recognizing.value = true
    confidenceValue.value = null
    toast.clear()
    toast.add({ id: 'predict', title: t('focus_recognizing'), color: 'info', duration: 0 })
    const start = performance.now()
    try {
      let output = ''
      let confidence: number | null = null
      const cloudProvider = getActiveCloudProvider(engineSettings)
      if (cloudProvider) {
        const cloud = await recognizeWithProvider(cloudProvider, file)
        output = cloud.latex
        confidence = cloud.confidence
      } else {
        if (!isReady.value) {
          throw new Error('本地模型还在首次下载中（约 80MB，只下载一次），请等顶部进度条完成后重试')
        }
        const result = await predict(file)
        if (result.status !== 'result') {
          throw new Error(result.output || t('unknown_error'))
        }
        output = result.output || ''
      }
      const elapsedMs = performance.now() - start
      const timeStr = elapsedMs < 1000 ? `${Math.round(elapsedMs)} ms` : `${(elapsedMs / 1000).toFixed(2)} s`
      confidenceValue.value = confidence
      toast.update('predict', { title: t('recognize_success') + ' ' + timeStr, color: 'success', duration: 1500 })
      return orthographyToLaTeX(formatLatex(output))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.update('predict', { title: t('recognize_failed') + ` ${message}`, color: 'error', duration: 0 })
      throw err
    } finally {
      recognizing.value = false
    }
  }

  return { recognizing, confidenceValue, runOCR, loadModel, isReady, progress }
}
```

注意：svg→png 转换（convertSvgToPng）只属于 /ocr 输入带场景，留在 ocr.vue；手写板导出的就是 PNG 不需要。

- [ ] **Step 3: ocr.vue 改接**

ocr.vue 中删除 `copyLatex`/`copyWordFormula`/`exportDocx`/`exporting`/识别路由块，替换为：

```ts
const formula = useFormulaActions(() => latexCode.value, t)
const { exporting } = formula
const recognizer = useRecognize({ t, toast })
const { recognizing, confidenceValue } = recognizer
```

模板绑定 `@copy-word="formula.copyWordFormula"`、`@copy-latex="formula.copyLatex"`、`@export-docx="formula.exportDocx"`；`runOCR(file)` 调用处改为 `recognizer.runOCR(file, engineSettings.value)`（原 `load(model_config)` 改 `recognizer.loadModel(model_config)`）；`maybeAutoCopy` 保留在 ocr.vue 内不变。

- [ ] **Step 4: 回归**

Run: `pnpm run generate`（本地全量预渲染）
Expected: 构建成功；`grep -c '把公式拍进来' .output/public/ocr/index.html` ≥ 1；手动 dev 起服冒烟——示例图识别、三个复制/导出按钮各点一次行为不变。

- [ ] **Step 5: Commit**

```bash
git add app/composables/useFormulaActions.ts app/composables/useRecognize.ts app/pages/ocr.vue
git commit -m "抽取识别动作与路由为共享 composable（/ocr 与 /write 共用，行为不变）"
```

---

### Task 4: HandwritingBoard.vue 画板组件

**Files:**
- Create: `app/components/HandwritingBoard.vue`

**Interfaces:** Consumes: `useStrokes()`（Task 2）、i18n 键 `write_*`（Task 6 提供，键名见 Task 6）。Produces:

```ts
defineEmits<{ change: [isEmpty: boolean] }>()
defineExpose<{ exportPng(): Promise<Blob | null> }>()
```

（清空/撤销/重做/橡皮/笔档全部内聚在组件工具条里；页面只接 `change` 与 `exportPng`。）

- [ ] **Step 1: 实现组件**

核心骨架（完整实现，样式用 pk-* token）：

```vue
<script setup lang="ts">
import { useStrokes, type Point } from '../composables/useStrokes'

const { t } = useI18n()
const { strokes, current, isEmpty, canUndo, canRedo, startStroke, addPoint, endStroke, undo, redo, clear, eraseAt } = useStrokes()

const wrap = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const emit = defineEmits<{ change: [isEmpty: boolean] }>()

// 工具状态：pen（细3/中6/粗10）| eraser
type Tool = { kind: 'pen'; width: number } | { kind: 'eraser' }
const tool = ref<Tool>({ kind: 'pen', width: 6 })
const penWidths = [3, 6, 10] as const
const LOGICAL_W = 1000
const LOGICAL_H = 440

let ctx: CanvasRenderingContext2D | null = null
let dpr = 1

function redraw() {
  if (!ctx) return
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const all = current.value ? [...strokes.value, current.value] : strokes.value
  for (const st of all) {
    if (st.points.length < 2) continue
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = st.width
    ctx.beginPath()
    ctx.moveTo(st.points[0].x, st.points[0].y)
    for (const p of st.points.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }
}

function resizeCanvas() {
  const el = canvas.value, box = wrap.value
  if (!el || !box || !ctx) return
  dpr = window.devicePixelRatio || 1
  el.width = LOGICAL_W * dpr
  el.height = LOGICAL_H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}

function toLogical(e: PointerEvent): Point {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: (e.clientX - rect.left) * (LOGICAL_W / rect.width), y: (e.clientY - rect.top) * (LOGICAL_H / rect.height) }
}

function onDown(e: PointerEvent) {
  canvas.value!.setPointerCapture(e.pointerId)
  const pt = toLogical(e)
  if (tool.value.kind === 'eraser') {
    eraseAt(pt, 14)
    redraw()
    return
  }
  startStroke(pt, tool.value.width)
  redraw()
}
function onMove(e: PointerEvent) {
  if (tool.value.kind === 'eraser') return   // 橡皮按下即擦（down 里处理），move 忽略
  if (!current.value) return
  addPoint(toLogical(e))
  redraw()
}
function onUp() {
  if (tool.value.kind === 'eraser') return
  endStroke()
  redraw()
  emit('change', isEmpty.value)
}

onMounted(() => {
  ctx = canvas.value!.getContext('2d')
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})
onBeforeUnmount(() => window.removeEventListener('resize', resizeCanvas))

watch([strokes, current], () => { emit('change', isEmpty.value) })

async function exportPng(): Promise<Blob | null> {
  return canvas.value ? new Promise(resolve => canvas.value!.toBlob(resolve, 'image/png')) : null
}
defineExpose({ exportPng })

function setPen(w: number) { tool.value = { kind: 'pen', width: w } }
function setEraser() { tool.value = { kind: 'eraser' } }
function doUndo() { undo(); redraw() }
function doRedo() { redo(); redraw() }
function doClear() { clear(); redraw(); emit('change', true) }
</script>
```

模板：外层 `wrap`（`w-full`，内嵌 padding 比例容器保持 1000:440）+ `canvas`（`touch-action: none`、`pointerdown/move/up/cancel`）+ 工具条（pk-btn sm：三档笔 = i-lucide-pen 图标 + 3/6/10 数字徽标、橡皮 i-lucide-eraser、撤销/重做 i-lucide-undo-2/redo-2 disabled 绑 canUndo/canRedo、清空 i-lucide-trash-2）；工具激活态 = `bg-[var(--pk-primary-soft)] border-[var(--pk-primary)]`。空态提示 `v-if="isEmpty && !current"` 绝对居中 `text-[var(--pk-muted)]`。

resize 细节：`wrap` 用 CSS `aspect-ratio: 1000/440`；canvas CSS 尺寸 100%。`resizeCanvas` 重设画布物理尺寸后重绘（笔画存逻辑坐标，无损）。

- [ ] **Step 2: 冒烟**

Run: `pnpm test`（useStrokes 仍绿）+ `pnpm run generate`
Expected: 构建成功（组件未被引用不进页面，仅验证可编译）

- [ ] **Step 3: Commit**

```bash
git add app/components/HandwritingBoard.vue
git commit -m "手写板画板组件（指针绘制/笔画橡皮/撤销重做/导出 PNG）"
```

---

### Task 5: write.vue 页面组装

**Files:**
- Create: `app/pages/write.vue`

**Interfaces:** Consumes: HandwritingBoard（Task 4）、useFormulaActions/useRecognize（Task 3）、PanelSource/PanelPreview（既有）、SettingsDrawer（既有，props `{ open, settings }` emit `save`）。Produces: 路由 `/write`。

- [ ] **Step 1: 实现页面**

关键逻辑（模板/样式按备课纸语言组织，容器 `max-w-[860px]`）：

```ts
const { t, locale } = useI18n()
const toast = useToast()
const board = ref<InstanceType<typeof HandwritingBoard> | null>(null)
const boardEmpty = ref(true)
const latexCode = ref('')
const showSettings = ref(false)
const engineSettings = ref<EngineSettings>(loadEngineSettings())
const { recognizing, confidenceValue, runOCR, loadModel } = useRecognize({ t, toast })
const { exporting, copyLatex, copyWordFormula, exportDocx } = useFormulaActions(() => latexCode.value, t)
const fontSize = ref(28)
const cloudName = computed(() => getActiveCloudProvider(engineSettings.value)?.name ?? '')
const isLocal = computed(() => !cloudName.value)

onMounted(async () => {
  const model_config = await useSource()
  useModelLoadingToast(t, model_config, loadModelProgress, loadModelIsReady)  // 见下方说明
  await loadModel(model_config)
})

async function recognize() {
  const blob = await board.value?.exportPng()
  if (!blob) return
  try {
    const out = await runOCR(new File([blob], `handwritten-${Date.now()}.png`, { type: 'image/png' }), engineSettings.value)
    if (!out.trim()) throw new Error(t('write_empty_result'))
    latexCode.value = out
  } catch { /* toast 已在 runOCR 内统一弹出 */ }
}
```

说明：`useModelLoadingToast` 的参数签名以 ocr.vue 现行调用为准（ocr.vue 传 `(t, model_config, progress, isReady)`——实现时照抄，不要新造）。SettingsDrawer `@save` 与 ocr.vue 一致（保存 engineSettings 并刷新 cloudName）。

模板结构：

```
[工具条 + HandwritingBoard（ref=board，@change="boardEmpty = $event"）]
[识别按钮 pk-btn solid :disabled="boardEmpty || recognizing" @click="recognize"]
[引擎 pill：本地 → `本地模型 · 手写建议人工核对`；云端 → `{{ cloudName }}`；点击 → showSettings = true]
[本地黄条 v-if="latexCode && isLocal"：write_local_notice（bg 荧光黄淡/描边）]
[结果两栏：PanelSource(:code :font-size :can-undo=false :can-redo=false :auto-copy="'off'" :exporting :confidence) + PanelPreview]
[图注：write_caption]
[SettingsDrawer v-model:open :settings @save]
```

- [ ] **Step 2: 本地验证**

Run: `pnpm run generate`
Expected: 构建成功；`.output/public/write/index.html` 含 `handwritten` 与 `write_local_notice` 的 i18n 文案（grep 中文「手写板」≥1）

- [ ] **Step 3: Commit**

```bash
git add app/pages/write.vue
git commit -m "手写板页 /write：画板 + 识别 + 结果区"
```

---

### Task 6: 接线（导航/首页/prerender/i18n）

**Files:**
- Modify: `app/components/AppHeader.vue`（教程 NuxtLink 块后插入手写板链接）
- Modify: `app/pages/index.vue`（feats③ + 手写体 ※ 注记）
- Modify: `nuxt.config.ts:56`（prerender routes）
- Modify: `i18n/locales/zh-CN.json`、`i18n/locales/en.json`

**Interfaces:** Consumes: 路由 `/write`（Task 5）。Produces: 导航入口与 i18n 键。

- [ ] **Step 1: AppHeader 导航**

在「教程」NuxtLink 之前插入手写板项（工作台之后）：

```vue
        <NuxtLink
          to="/write"
          class="rounded-md px-2 py-1.5 text-[13px] sm:px-3 sm:text-sm"
          :class="route.path.startsWith('/write') ? 'bg-[rgba(255,255,255,0.16)] font-semibold text-white' : 'text-[var(--pk-chalk-dim)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'"
        >
          {{ t('nav_write') }}
        </NuxtLink>
```

- [ ] **Step 2: i18n 键（zh-CN.json / en.json 成对）**

```json
"nav_write": "手写板"            / "nav_write": "Handwrite"
"write_board_hint": "在这里写公式，写完点识别"     / "Write a formula here, then tap Recognize"
"write_recognize": "识别"        / "Recognize"
"write_pen": "笔"               / "Pen"
"write_pen_thin": "细" / "write_pen_med": "中" / "write_pen_bold": "粗"   / Thin/Medium/Bold
"write_eraser": "橡皮"           / "Eraser"
"write_undo": "撤销" / "write_redo": "重做" / "write_clear": "清空"   / Undo/Redo/Clear
"write_engine_label": "识别引擎"  / "Engine"
"write_engine_local": "本地模型（手写建议人工核对）" / "Local model (verify handwriting output)"
"write_local_notice": "手写识别建议人工核对；潦草字迹可在设置中切换云端引擎对照" / "Please double-check handwriting results; for messy strokes, switch to a cloud engine in Settings"
"write_caption": "图 · 手写板：写公式 → 识别 → 复制进 Word" / "Fig · Handwriting board: write → recognize → copy into Word"
"write_empty_result": "未识别出内容，请写清楚一点或切换云端引擎" / "Nothing recognized — write more clearly or switch engines in Settings"
```

（home_capture_note 文案改写在 Step 3。）

- [ ] **Step 3: index.vue 两处**

feats 数组第三项：`{ icon: 'i-lucide-pencil-line', name: t('home_feat3_name'), desc: t('home_feat3_desc'), to: '/write', wip: false }`。
`home_capture_note` 文案改为：zh `"※ 本地引擎即可识别手写公式（工整字迹准）；潦草字迹建议在设置里开启云端引擎对照"`；en `"※ Handwriting works on the local engine (neat writing); enable a cloud engine in Settings for messy strokes"`。

- [ ] **Step 4: nuxt.config.ts**

`prerender.routes` 追加 `'/write'`。

- [ ] **Step 5: 全量验证**

Run: `pnpm run generate`
Expected: 14+1=15 routes；`grep -c '手写板' .output/public/write/index.html` ≥ 1；`grep -c 'demo-hero' .output/public/index.html` ≥ 1（首页未回归）；`grep -c '把公式拍进来' .output/public/ocr/index.html` ≥ 1。

- [ ] **Step 6: Commit**

```bash
git add app/components/AppHeader.vue app/pages/index.vue nuxt.config.ts i18n/locales/zh-CN.json i18n/locales/en.json
git commit -m "接线：导航/首页功能卡③实线/手写※注记改写/prerender/i18n"
```

---

### Task 7: 部署 + 线上验收 + 实操回归

**Files:** 无新增（验证任务）

- [ ] **Step 1: push（重试环）**

```bash
for i in 1..8: git push origin main; 若仍 ahead 则 sleep i*7 重试
```

- [ ] **Step 2: 线上轮询**

`curl https://snaplatex.cn/write/`（200 且含「手写板」）、`curl -o /dev/null -w %{http_code} https://snaplatex.cn/`（200）、`/ocr/` 与 `/guide/` 内容标识仍在（铁律）。

- [ ] **Step 3: computer-use 实操回归**

Edge 打开 snaplatex.cn/write：鼠标手写 `x²+2x+1=0` 风格笔画 → 识别 → 截图结果；切 SimpleTex（如已配 key）对照一次；复制成 Word 公式 → Word ⌘V 实测。截图留档并在回复中呈现。

- [ ] **Step 4: Commit（如线上发现问题修复）+ 汇报**

---

## Self-Review 记录

- **Spec 覆盖**：§2 v1 范围 → Task 2-6；§4.1-4.4 → Task 4/5/3；§5 核查结论（无需修复，已修正 spec）→ 无任务；§6.1-6.6 → Task 6；§7 错误处理 → Task 5（空结果 throw + 现有链路）；§8 v2 → 不实现；§9 验收 → Task 1/2（单测）+ Task 7（实操/回归集）。
- **占位符扫描**：无 TBD/TODO；Task 5 的 useModelLoadingToast 签名「以 ocr.vue 现行调用为准」是显式的实现期核对指令（防计划与代码漂移），非占位。
- **类型一致性**：useStrokes 接口（Task 2 定义 = Task 4 消费）一致；useFormulaActions/useRecognize（Task 3 定义 = Task 5 消费）一致；PanelSource props（canUndo=false 固定值——手写页源码不做撤销栈，与 ocr.vue 的文本撤销不同）已在 Task 5 标注。
