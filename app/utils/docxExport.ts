import { Document, Packer, Paragraph, AlignmentType } from '@seewo-doc/docx'
import { convertMathMl2Math } from '@seewo-doc/docx-math-converter'
import { convertToMathML } from '../composables/textProcessor'

/*
  模块 4：浏览器端 .docx 导出。
  链路：KaTeX MathML（与预览/剪贴板同源）→ docx Math 对象 → Packer 出 blob。
  不走 MML2OMML.XSL（Windows-only 死路），不引入后端或 pandoc。
*/
export async function latexToDocxBlob(latex: string): Promise<Blob> {
  const mathml = convertToMathML(latex)
  if (!mathml) throw new Error('empty formula')

  const mathObj = convertMathMl2Math(mathml)
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [mathObj]
        })
      ]
    }]
  })
  return Packer.toBlob(doc)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
