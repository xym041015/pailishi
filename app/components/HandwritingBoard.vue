<template>
  <div class="flex flex-col gap-2">
    <!-- 画板：逻辑分辨率 1000×440，容器按比例缩放；深浅色模式均白底（笔迹硬编码黑） -->
    <div
      ref="wrap"
      class="relative aspect-[1000/440] w-full overflow-hidden rounded-md border border-[var(--pk-line)] bg-white"
    >
      <canvas
        ref="canvas"
        class="block h-full w-full touch-none"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onCancel"
      />
      <p
        v-if="isEmpty && !current"
        class="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-sm text-[#64717d]"
      >
        {{ t('write_board_hint') }}
      </p>
    </div>

    <!-- 工具条：三档笔 / 橡皮 / 撤销 / 重做 / 清空 -->
    <div class="flex flex-wrap items-center gap-1.5">
      <div
        class="flex items-center gap-1.5"
        role="group"
        :aria-label="t('write_pen')"
      >
        <button
          v-for="w in penWidths"
          :key="w"
          type="button"
          class="pk-btn pk-btn-sm"
          :class="isPen(w) ? toolActiveCls : toolIdleCls"
          :title="t(penTitles[w])"
          :aria-label="t(penTitles[w])"
          :aria-pressed="isPen(w)"
          @click="setPen(w)"
        >
          <UIcon
            name="i-lucide-pen"
            class="h-3.5 w-3.5"
          />
          <span class="text-[10px] font-semibold leading-none">{{ w }}</span>
        </button>
      </div>

      <button
        type="button"
        class="pk-btn pk-btn-sm"
        :class="tool.kind === 'eraser' ? toolActiveCls : toolIdleCls"
        :title="t('write_eraser')"
        :aria-label="t('write_eraser')"
        :aria-pressed="tool.kind === 'eraser'"
        @click="setEraser"
      >
        <UIcon
          name="i-lucide-eraser"
          class="h-3.5 w-3.5"
        />
      </button>

      <span
        class="mx-1 h-4 w-px bg-[var(--pk-line)]"
        aria-hidden="true"
      />

      <button
        type="button"
        class="pk-btn pk-btn-sm disabled:opacity-40"
        :class="toolIdleCls"
        :disabled="!canUndo"
        :title="t('write_undo')"
        :aria-label="t('write_undo')"
        @click="doUndo"
      >
        <UIcon
          name="i-lucide-undo-2"
          class="h-3.5 w-3.5"
        />
      </button>

      <button
        type="button"
        class="pk-btn pk-btn-sm disabled:opacity-40"
        :class="toolIdleCls"
        :disabled="!canRedo"
        :title="t('write_redo')"
        :aria-label="t('write_redo')"
        @click="doRedo"
      >
        <UIcon
          name="i-lucide-redo-2"
          class="h-3.5 w-3.5"
        />
      </button>

      <button
        type="button"
        class="pk-btn pk-btn-sm disabled:opacity-40"
        :class="toolIdleCls"
        :disabled="isEmpty"
        :title="t('write_clear')"
        :aria-label="t('write_clear')"
        @click="doClear"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="h-3.5 w-3.5"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStrokes, type Point } from '../composables/useStrokes'

const { t } = useI18n()
const { strokes, current, isEmpty, canUndo, canRedo, startStroke, addPoint, endStroke, undo, redo, clear, eraseAt } = useStrokes()

const wrap = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const emit = defineEmits<{ change: [isEmpty: boolean] }>()

// 工具状态：pen（细3/中6/粗10）| eraser
type Tool = { kind: 'pen', width: number } | { kind: 'eraser' }
const tool = ref<Tool>({ kind: 'pen', width: 6 })
const penWidths = [3, 6, 10] as const
const penTitles: Record<(typeof penWidths)[number], string> = {
  3: 'write_pen_thin',
  6: 'write_pen_med',
  10: 'write_pen_bold'
}
// 画板逻辑分辨率固定 1000×440，笔画以逻辑坐标存储，容器缩放无损
const LOGICAL_W = 1000
const LOGICAL_H = 440
const ERASER_RADIUS = 14

let ctx: CanvasRenderingContext2D | null = null
let activeId: number | null = null // 正在绘制的指针 id（多指触控只认第一指）

// 工具按钮两种状态（pk-btn 自带 1.5px 透明描边，激活态换色不跳版）
const toolActiveCls = 'bg-[var(--pk-primary-soft)] border-[var(--pk-primary)] text-[var(--pk-primary)]'
const toolIdleCls = 'text-[var(--pk-icon)] hover:bg-[var(--pk-primary-soft)] hover:text-[var(--pk-primary)]'

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

// 重设物理尺寸（×devicePixelRatio）并重绘；笔画存逻辑坐标，重绘即还原
function resizeCanvas() {
  const el = canvas.value, box = wrap.value
  if (!el || !box || !ctx) return
  const dpr = window.devicePixelRatio || 1
  el.width = Math.round(LOGICAL_W * dpr)
  el.height = Math.round(LOGICAL_H * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}

// 屏幕坐标 → 画板逻辑坐标（按 canvas 实际渲染尺寸等比映射）
function toLogical(e: PointerEvent): Point {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: (e.clientX - rect.left) * (LOGICAL_W / rect.width), y: (e.clientY - rect.top) * (LOGICAL_H / rect.height) }
}

// 笔画级橡皮：命中整笔删除；命中导致空态变化时同步页面（原地 splice，浅 watch 感知不到）
function eraseAtPt(pt: Point) {
  if (eraseAt(pt, ERASER_RADIUS)) emitChange()
  redraw()
}

function onDown(e: PointerEvent) {
  if (activeId !== null || e.button !== 0) return // 已有指针绘制中 / 非主键不落墨
  activeId = e.pointerId
  try {
    canvas.value!.setPointerCapture(e.pointerId)
  } catch { /* 指针已释放，无需捕获 */ }
  const pt = toLogical(e)
  if (tool.value.kind === 'eraser') {
    eraseAtPt(pt)
    return
  }
  startStroke(pt, tool.value.width)
  redraw()
}

function onMove(e: PointerEvent) {
  if (e.pointerId !== activeId) return // activeId 非空即按住中，顺带过滤悬停 move
  const pt = toLogical(e)
  if (tool.value.kind === 'eraser') {
    eraseAtPt(pt) // 拖动连擦：按住滑过即逐笔擦除
    return
  }
  if (!current.value) return
  addPoint(pt)
  redraw()
}

function onUp(e: PointerEvent) {
  if (e.pointerId !== activeId) return
  finishStroke()
}

function onCancel(e: PointerEvent) {
  if (e.pointerId !== activeId) return
  // 系统打断（来电/滚动手势等）也收笔，避免笔画悬挂在 current 上
  finishStroke()
}

function finishStroke() {
  activeId = null
  if (tool.value.kind === 'eraser') return
  endStroke()
  redraw()
  emitChange()
}

// undo/redo/eraseAt 都是原地变更（pop/push/splice），浅 watch 不触发；
// isEmpty 只取决于已提交笔画数，用 length getter 做最小且正确的监听源
watch(() => strokes.value.length, emitChange)

let lastEmpty: boolean | null = null
function emitChange() {
  if (isEmpty.value === lastEmpty) return
  lastEmpty = isEmpty.value
  emit('change', lastEmpty)
}

onMounted(() => {
  ctx = canvas.value!.getContext('2d')
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  emitChange() // 向页面同步初始空态
})
onBeforeUnmount(() => window.removeEventListener('resize', resizeCanvas))

async function exportPng(): Promise<Blob | null> {
  return canvas.value ? new Promise(resolve => canvas.value!.toBlob(resolve, 'image/png')) : null
}
defineExpose({ exportPng })

function setPen(w: number) {
  tool.value = { kind: 'pen', width: w }
}

function setEraser() {
  tool.value = { kind: 'eraser' }
}

function isPen(w: number) {
  return tool.value.kind === 'pen' && tool.value.width === w
}

function doUndo() {
  undo()
  redraw()
  emitChange()
}

function doRedo() {
  redo()
  redraw()
  emitChange()
}

function doClear() {
  clear()
  redraw()
  emitChange()
}
</script>
