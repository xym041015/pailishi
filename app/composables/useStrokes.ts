import { computed, ref, type ComputedRef, type Ref } from 'vue'

export interface Point { x: number, y: number }
export interface Stroke { points: Point[], width: number }
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
  // 点到线段的最短距离平方（投影点 clamp 到线段范围内）
  function distToSegment2(p: Point, a: Point, b: Point) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    return dist2(p, { x: a.x + t * dx, y: a.y + t * dy })
  }
  function eraseAt(pt: Point, radius: number): boolean {
    const r2 = radius * radius
    const idx = strokes.value.findIndex(st =>
      st.points.some((p, i) =>
        i > 0 && distToSegment2(pt, st.points[i - 1], p) <= r2
      )
    )
    if (idx === -1) return false
    strokes.value.splice(idx, 1)
    redoStack.value = []
    return true
  }
  return { strokes, current, isEmpty, canUndo, canRedo, startStroke, addPoint, endStroke, undo, redo, clear, eraseAt }
}
