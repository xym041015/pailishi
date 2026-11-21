import { computed, ref, type ComputedRef, type Ref } from 'vue'

export interface HistoryItem {
  id: string
  ts: number
  latex: string
  thumb: string | null
  engine: string
  source: 'ocr' | 'write'
}
export interface HistoryStorage {
  read(): string | null
  write(s: string): boolean
}

const KEY = 'pailishi-history-v1'

function defaultStorage(): HistoryStorage {
  return {
    read() {
      try {
        return localStorage.getItem(KEY)
      } catch {
        return null
      }
    },
    write(s: string) {
      try {
        localStorage.setItem(KEY, s)
        return true
      } catch {
        return false
      }
    }
  }
}

// 去重比较用：忽略所有空白差异（' x + 1 ' 与 'x+1' 视为同一条）
function stripWs(s: string): string {
  return s.replace(/\s+/g, '')
}

export function useRecognitionHistory(storage: HistoryStorage = defaultStorage(), max = 30) {
  const items: Ref<HistoryItem[]> = ref(load())

  function load(): HistoryItem[] {
    try {
      const raw = storage.read()
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }
  // persisted（composable 级）：是否成功落库过。从未成功（存储被禁用/损坏，defaultStorage 把
  // setItem 异常吞成 false）→ 不淘汰，保留完整内存会话态；曾成功落库后再失败 → 真配额超限，
  // 淘汰最旧重试；throw = 存储损坏 → 停止持久化，保留内存会话态
  let persisted = false
  function persist() {
    try {
      while (items.value.length > 1) {
        if (storage.write(JSON.stringify(items.value))) {
          persisted = true
          return
        }
        if (!persisted) break // 从未成功落库 → 不淘汰（存储禁用/损坏场景，异常被吞成 false）
        items.value.pop() // 淘汰最旧（真配额超限）
      }
      if (storage.write(JSON.stringify(items.value))) persisted = true // 单条与空列表（clear）也尝试落库
    } catch { /* 存储不可用：仅内存 */ }
  }
  function add(entry: { latex: string, thumb: string | null, engine: string, source: 'ocr' | 'write' }) {
    const latex = entry.latex.trim()
    if (!latex) return
    if (items.value[0] && stripWs(items.value[0].latex) === stripWs(latex)) return // 相邻去重
    items.value.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(), latex, thumb: entry.thumb, engine: entry.engine, source: entry.source
    })
    while (items.value.length > max) items.value.pop()
    persist()
  }
  function remove(id: string) {
    // 读合并写：抽屉打开期间其他实例（useRecognize 内部 add）可能已落 storage，
    // 先并入本实例未见过的条目再删，避免用陈旧列表 persist 抹掉新条目（双实例 lost-update）。
    // 用并集而非 load() 直接覆盖：storage 禁用时 load() 返回 [] 会清掉内存会话态
    const stored = load().filter(s => !items.value.some(m => m.id === s.id))
    items.value = [...stored, ...items.value].filter(x => x.id !== id)
    persist()
  }
  function clear() {
    items.value = []
    persist()
  }
  // 重读 storage：页面实例与 useRecognize 内部实例各自持有 ref（不自动同步），
  // 页面在打开抽屉前调用一次即可拿到最新列表（useRecognize 的 add 已落 storage）
  function reload() {
    items.value = load()
  }
  const isEmpty: ComputedRef<boolean> = computed(() => items.value.length === 0)
  return { items, isEmpty, add, remove, clear, reload }
}
