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
    // 单点不落墨（见 endStroke 空笔画用例），构造至少两点的真实笔画
    s.startStroke({ x: 0, y: 0 }, 6)
    s.addPoint({ x: 10, y: 0 })
    s.endStroke()
    s.startStroke({ x: 1, y: 1 }, 3)
    s.addPoint({ x: 11, y: 1 })
    s.endStroke()
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
    s.startStroke({ x: 0, y: 0 }, 6)
    s.endStroke()
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
    s.startStroke({ x: 200, y: 200 }, 6)
    s.addPoint({ x: 260, y: 260 })
    s.endStroke()
    expect(s.eraseAt({ x: 25, y: 3 }, 10)).toBe(true) // 命中第一笔
    expect(s.strokes.value.length).toBe(1)
    expect(s.eraseAt({ x: 999, y: 999 }, 5)).toBe(false)
    expect(s.strokes.value.length).toBe(1)
  })

  it('endStroke 空笔画不提交', () => {
    const s = useStrokes()
    s.startStroke({ x: 0, y: 0 }, 6)
    s.endStroke()
    expect(s.strokes.value.length).toBe(0) // 单点也视为空笔画（点击不落墨）
  })
})
