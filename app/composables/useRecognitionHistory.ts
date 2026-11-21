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
  function persist() {
    // false = 配额超限 → 淘汰最旧重试，内存最多保留最新一条；throw = 存储损坏 → 停止持久化，保留内存会话态
    try {
      while (items.value.length > 1) {
        if (storage.write(JSON.stringify(items.value))) return
        items.value.pop() // 淘汰最旧
      }
      storage.write(JSON.stringify(items.value)) // 单条与空列表（clear）也尝试落库
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
    items.value = items.value.filter(x => x.id !== id)
    persist()
  }
  function clear() {
    items.value = []
    persist()
  }
  const isEmpty: ComputedRef<boolean> = computed(() => items.value.length === 0)
  return { items, isEmpty, add, remove, clear }
}
