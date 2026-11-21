import { describe, it, expect } from 'vitest'
import { useRecognitionHistory, type HistoryStorage } from '../useRecognitionHistory'

function fakeStorage(opts: { failWritesOver?: number } = {}): HistoryStorage & { writes: number } {
  let data: string | null = null
  let writes = 0
  return {
    get writes() { return writes },
    read() { return data },
    write(s: string) {
      writes++
      if (opts.failWritesOver !== undefined && writes > opts.failWritesOver) return false
      data = s
      return true
    }
  }
}
const entry = (latex: string, engine = '本地') => ({ latex, thumb: null, engine, source: 'ocr' as const })

describe('useRecognitionHistory', () => {
  it('add 置顶且持久化', () => {
    const st = fakeStorage()
    const h = useRecognitionHistory(st)
    h.add(entry('a'))
    h.add(entry('b'))
    expect(h.items.value.map(x => x.latex)).toEqual(['b', 'a'])
    expect(st.writes).toBe(2)
    expect(JSON.parse(st.read()!).length).toBe(2)
  })

  it('相邻去重（trim 后相同跳过，只更新不落库不成立→直接跳过）', () => {
    const h = useRecognitionHistory(fakeStorage())
    h.add(entry(' x + 1 '))
    h.add(entry('x+1'))
    expect(h.items.value.length).toBe(1)
  })

  it('FIFO 淘汰到 max', () => {
    const h = useRecognitionHistory(fakeStorage(), 3)
    for (const s of ['1', '2', '3', '4']) h.add(entry(s))
    expect(h.items.value.map(x => x.latex)).toEqual(['4', '3', '2'])
  })

  it('QuotaExceeded：淘汰最旧重试直至写入成功', () => {
    const st = fakeStorage({ failWritesOver: 1 }) // 第 2 次写起失败
    const h = useRecognitionHistory(st, 10)
    h.add(entry('1'))
    h.add(entry('2')) // 写失败 → 淘汰 '1' → 重试成功
    expect(h.items.value.map(x => x.latex)).toEqual(['2'])
    expect(st.read()).toContain('2')
  })

  it('storage 抛异常退化为内存会话态', () => {
    const broken: HistoryStorage = {
      read() { throw new Error('no') },
      write() { throw new Error('no') }
    }
    const h = useRecognitionHistory(broken)
    h.add(entry('x'))
    expect(h.items.value.length).toBe(1) // 内存里有
  })

  it('remove / clear', () => {
    const st = fakeStorage()
    const h = useRecognitionHistory(st)
    h.add(entry('1'))
    h.add(entry('2'))
    h.remove(h.items.value[0].id)
    expect(h.items.value.length).toBe(1)
    h.clear()
    expect(h.isEmpty.value).toBe(true)
    expect(JSON.parse(st.read()!)).toEqual([])
  })
})
