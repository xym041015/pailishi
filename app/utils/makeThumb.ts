// 识别历史缩略图：白底打平 → 等比缩到宽 128 → JPEG dataURL；任何异常返回 null
export async function makeThumb(file: File, width = 128): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    try {
      const scale = Math.min(1, width / bitmap.width) // 小图不放大
      const w = Math.max(1, Math.round(bitmap.width * scale))
      const h = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(bitmap, 0, 0, w, h)
      return canvas.toDataURL('image/jpeg', 0.75)
    } finally {
      bitmap.close() // toDataURL 抛出也不泄漏 bitmap
    }
  } catch {
    return null
  }
}
