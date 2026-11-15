import { ref, type Ref } from 'vue'
// MathML 必须同步算好（见 copyWordFormula 内 Safari 手势栈注释），保持 ocr.vue 现行的静态 import；
// 不能改成动态 import——await 会把 clipboard.write() 挤出用户手势同步栈（WebKit 222262）
import { convertToMathML } from './textProcessor'

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

  // 模块 2：剪贴板双 flavor。Word 在 text/html 与 text/plain 并存时优先吃 text/html，
  // 把 MathML 包进完整 HTML 文档；纯文本目标（输入框/聊天窗）则吃到 text/plain 的 LaTeX 源码。
  // Safari 要求 clipboard.write() 处在用户手势同步栈内（WebKit 222262）——MathML 全部同步算好，只在最后 await 一次。
  async function copyWordFormula() {
    const latex = getLatex()
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

  // ---- 模块 4：浏览器端 .docx 导出 ----
  async function exportDocx() {
    if (!getLatex() || exporting.value) return
    exporting.value = true
    try {
      // 客户端动态加载：docx 依赖链（whatwg-url → punycode）不能进 SSR 包，
      // 否则 Nitro cloudflare 预设的 unenv shim 会报 ENOTDIR。必须保持动态 import。
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
