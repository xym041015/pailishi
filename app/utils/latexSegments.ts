// LaTeX 源码分段与预览高亮工具。
// 思路：把源码按"单元"切开——一个单元 = 基础符号/命令 + 挂在其上的上下标和参数，
// \left...\right 配对与 \begin...\end 环境整体各算一个单元。渲染时给每个单元包一层
// \htmlData{seg=N}{...}（需要 KaTeX 的 trust 开关），预览 DOM 里就会出现 data-seg 标记；
// 源码选区变化时按坐标算出命中的 seg 列表，预览里给对应片段加高亮类。

export interface LatexUnit {
  start: number
  end: number
}

// 需要跟随命令一起包裹的花括号参数个数（参数若留在包裹外，KaTeX 会解析报错）
const MACRO_ARGS: Record<string, number> = {
  binom: 2, bar: 1, boldsymbol: 1, box: 1, cancel: 1, cfrac: 2, color: 1,
  dbinom: 2, ddot: 1, dddot: 1, dfrac: 2, dot: 1, fbox: 1, frac: 2,
  hat: 1, hphantom: 1, mathbb: 1, mathbin: 1, mathcal: 1, mathfrak: 1,
  mathit: 1, mathop: 1, mathord: 1, mathrel: 1, mathrm: 1, mathscr: 1,
  mathsf: 1, mathbf: 1, mathtt: 1, operatorname: 1, overbrace: 1, overleftarrow: 1,
  overline: 1, overrightarrow: 1, overset: 2, phantom: 1, pmod: 1, smash: 1,
  sqrt: 1, stackrel: 2, substack: 1, tag: 1, text: 1, textbf: 1, textit: 1,
  textnormal: 1, textrm: 1, textsf: 1, texttt: 1, textcolor: 2,
  tbinom: 2, tfrac: 2, tilde: 1, underbrace: 1, underline: 1,
  underrightarrow: 1, underset: 2, vec: 1, vphantom: 1,
  widecheck: 1, widehat: 1, widetilde: 1, xleftarrow: 1, xrightarrow: 1
}

// 含这些 TeX 原语的源码不做包裹：它们的分组语义会被花括号改变，包了渲染会变样
const UNSAFE_PRIMITIVES = ['\\over', '\\atop', '\\above', '\\choose', '\\withdelims', '\\middle', '\\not']

function isLetter(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

function isWordChar(c: string): boolean {
  return isLetter(c) || (c >= '0' && c <= '9')
}

// src[i] === '\\'：返回命令名（含反斜杠与可能的 *）之后的位置
function readCommandEnd(src: string, i: number, to: number): number {
  let j = i + 1
  if (j >= to) return j
  if (!isLetter(src[j])) return j + 1
  while (j < to && isLetter(src[j])) j++
  if (j < to && src[j] === '*') j++
  return j
}

// src[i] === '{'：返回配对 '}' 之后的位置（转义感知；不配对时返回 to）
function readGroupEnd(src: string, i: number, to: number): number {
  let depth = 0
  let j = i
  while (j < to) {
    const c = src[j]
    if (c === '\\') {
      j += 2
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return j + 1
    }
    j++
  }
  return to
}

// src[i] === '['：返回配对 ']' 之后的位置
function readBracketEnd(src: string, i: number, to: number): number {
  let j = i + 1
  while (j < to && src[j] !== ']') {
    if (src[j] === '\\') j++
    j++
  }
  return j < to ? j + 1 : to
}

// 读一个参数：花括号组 / 命令 / 单字符
function readArgEnd(src: string, i: number, to: number): number {
  if (i >= to) return i
  const c = src[i]
  if (c === '{') return readGroupEnd(src, i, to)
  if (c === '\\') return readCommandEnd(src, i, to)
  return i + 1
}

// \left / \right 后面的定界符：命令（如 \{）或单字符
function readDelimEnd(src: string, i: number, to: number): number {
  if (i >= to) return i
  if (src[i] === '\\') return readCommandEnd(src, i, to)
  return i + 1
}

// 收集单元后面的连续上下标：返回结束位置与递归包裹后的脚本片段
function attachScripts(src: string, i: number, to: number, units: LatexUnit[]): { end: number, text: string } {
  let text = ''
  let j = i
  while (j < to && (src[j] === '^' || src[j] === '_')) {
    const argStart = j + 1
    const argEnd = readArgEnd(src, argStart, to)
    if (src[argStart] === '{') {
      text += src[j] + '{' + buildLevel(src, argStart + 1, argEnd - 1, units) + '}'
    } else {
      text += src.slice(j, argEnd)
    }
    j = argEnd
  }
  return { end: j, text }
}

// 处理一层源码 [from, to)：返回给每个单元包上 \htmlData 后的新字符串，
// 同时把单元的原始坐标收集进 units（含递归产生的子单元）
function buildLevel(src: string, from: number, to: number, units: LatexUnit[]): string {
  let out = ''
  let i = from
  while (i < to) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      out += c
      i++
      continue
    }
    if (c === '%') {
      const e = src.indexOf('\n', i)
      const stop = e === -1 ? to : Math.min(e + 1, to)
      out += src.slice(i, stop)
      i = stop
      continue
    }
    if (c === '&' || (c === '\\' && i + 1 < to && src[i + 1] === '\\')) {
      // & 与换行 \\ 原样保留（环境内部需要它们出现在包裹层之间）
      out += c === '&' ? c : '\\\\'
      i += c === '&' ? 1 : 2
      continue
    }

    const start = i
    let end = i
    let inner = ''

    if (c === '\\') {
      const cmdEnd = readCommandEnd(src, i, to)
      const cmd = src.slice(i, cmdEnd)

      if (cmd === '\\left') {
        // \left..\right 配对整体一个单元（含中间内容的递归包裹）
        let j = readDelimEnd(src, cmdEnd, to)
        const midStart = j
        let depth = 1
        let rightCmdStart = -1
        let after = -1
        while (j < to) {
          if (src[j] === '\\') {
            const ce = readCommandEnd(src, j, to)
            const nm = src.slice(j, ce)
            if (nm === '\\left') {
              depth++
              j = readDelimEnd(src, ce, to)
            } else if (nm === '\\right') {
              depth--
              j = readDelimEnd(src, ce, to)
              if (depth === 0) {
                rightCmdStart = j
                after = j
                break
              }
            } else {
              j = ce
            }
          } else {
            j++
          }
        }
        if (rightCmdStart >= 0) {
          inner = src.slice(start, midStart)
            + buildLevel(src, midStart, rightCmdStart, units)
            + src.slice(rightCmdStart, after)
          end = after
        } else {
          // 未配对：原样保留不包裹
          const dEnd = readDelimEnd(src, cmdEnd, to)
          out += src.slice(start, dEnd)
          i = dEnd
          continue
        }
      } else if (cmd === '\\begin') {
        // \begin{env}...\end{env} 环境整体一个单元
        const argEnd = readGroupEnd(src, cmdEnd, to)
        // 环境名后的可选参数与列格式（如 array 的 {cc}、[t]）原样保留，不递归包裹
        let prefixEnd = argEnd
        if (src[prefixEnd] === '[') prefixEnd = readBracketEnd(src, prefixEnd, to)
        if (src[prefixEnd] === '{') prefixEnd = readGroupEnd(src, prefixEnd, to)
        let j = prefixEnd
        let depth = 1
        let endCmdStart = -1
        let after = -1
        while (j < to) {
          if (src[j] === '\\') {
            const ce = readCommandEnd(src, j, to)
            const nm = src.slice(j, ce)
            if (nm === '\\begin') {
              depth++
              j = readGroupEnd(src, ce, to)
            } else if (nm === '\\end') {
              depth--
              j = readGroupEnd(src, ce, to)
              if (depth === 0) {
                endCmdStart = j
                after = j
                break
              }
            } else {
              j = ce
            }
          } else {
            j++
          }
        }
        if (endCmdStart >= 0) {
          inner = src.slice(start, prefixEnd)
            + buildLevel(src, prefixEnd, endCmdStart, units)
            + src.slice(endCmdStart, after)
          end = after
        } else {
          // 未闭合：原样保留不包裹
          out += src.slice(start, prefixEnd)
          i = prefixEnd
          continue
        }
      } else if (cmd === '\\right' || cmd === '\\end') {
        // 孤立的 \right / \end：原样保留不包裹
        const dEnd = cmd === '\\right' ? readDelimEnd(src, cmdEnd, to) : readGroupEnd(src, cmdEnd, to)
        out += src.slice(start, dEnd)
        i = dEnd
        continue
      } else {
        // 普通命令：命令本体 + 已知个数的参数一起包裹
        const arity = MACRO_ARGS[cmd.slice(1).replace(/\*$/, '')] ?? 0
        let j = cmdEnd
        const parts: string[] = []
        if (arity > 0 && src[j] === '[') {
          const be = readBracketEnd(src, j, to)
          parts.push(src.slice(j, be))
          j = be
        }
        for (let a = 0; a < arity; a++) {
          const ae = readArgEnd(src, j, to)
          if (ae === j) break
          if (src[j] === '{') parts.push('{' + buildLevel(src, j + 1, ae - 1, units) + '}')
          else parts.push(src.slice(j, ae))
          j = ae
        }
        inner = cmd + parts.join('')
        end = j
      }
    } else if (c === '{') {
      // 顶层花括号组
      const ge = readGroupEnd(src, i, to)
      inner = '{' + buildLevel(src, i + 1, ge - 1, units) + '}'
      end = ge
    } else {
      // 普通字符：连续字母数字合并为一个单元
      let j = i + 1
      if (isWordChar(c)) {
        while (j < to && isWordChar(src[j])) j++
      }
      inner = src.slice(i, j)
      end = j
    }

    // 附加紧随的 \limits / \nolimits（必须与前面的算子同组，不能拆开包裹）
    for (;;) {
      if (src.startsWith('\\limits', end) || src.startsWith('\\nolimits', end)) {
        const ce = readCommandEnd(src, end, to)
        inner += src.slice(end, ce)
        end = ce
      } else {
        break
      }
    }

    // 附加单元后的连续上下标
    const sc = attachScripts(src, end, to, units)
    const segId = units.length
    units.push({ start, end: sc.end })
    out += '\\htmlData{seg=' + segId + '}{' + inner + sc.text + '}'
    i = sc.end
  }
  return out
}

// 把源码加工成带 data-seg 标记的渲染源码；任何异常都回退为原串（只是没有高亮）
export function buildLatexPreview(src: string): { wrapped: string, units: LatexUnit[] } {
  if (!src || UNSAFE_PRIMITIVES.some(p => src.includes(p))) return { wrapped: src, units: [] }
  const units: LatexUnit[] = []
  try {
    const wrapped = buildLevel(src, 0, src.length, units)
    return { wrapped, units }
  } catch {
    return { wrapped: src, units: [] }
  }
}

// 源码选区 [start, end) 命中的单元列表：
// - 完整落在选区内的单元全部命中；
// - 与选区部分相交的单元，只有当它内部没有更小的相交子单元时才命中
//   （即命中"最小"的相交片段，向上不会扩散）。
export function segsForRange(units: LatexUnit[], start: number, end: number): number[] {
  if (end <= start) return []
  const hit: number[] = []
  for (let k = 0; k < units.length; k++) {
    const u = units[k]
    if (u.end <= start || u.start >= end) continue
    if (u.start >= start && u.end <= end) {
      hit.push(k)
      continue
    }
    let hasSmaller = false
    for (let m = 0; m < units.length; m++) {
      if (m === k) continue
      const v = units[m]
      if (v.start < end && v.end > start
        && v.start >= u.start && v.end <= u.end
        && (v.end - v.start) < (u.end - u.start)) {
        hasSmaller = true
        break
      }
    }
    if (!hasSmaller) hit.push(k)
  }
  return hit
}
