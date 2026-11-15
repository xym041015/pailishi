import { env, VisionEncoderDecoderModel, PreTrainedTokenizer, Tensor, cat } from '@huggingface/transformers'
import { Image, decode } from 'image-js'
import fs from 'node:fs'
env.remoteHost = 'https://snaplatex.cn'
env.remotePathTemplate = 'hf/{model}/resolve/{revision}'
env.allowLocalModels = false
env.cacheDir = './.cache'
const MEAN = 0.7931, STD = 0.1738

// ===== 逐字复制自 app/composables/workers/imageProcessor.ts =====
function reverseColor(image) {
  const histogram = image.histogram()
  const threshold = 200
  const black_pixels = histogram.slice(0, threshold).reduce((sum, v) => sum + v, 0)
  const white_pixels = histogram.slice(threshold).reduce((sum, v) => sum + v, 0)
  if (black_pixels >= white_pixels) { return image.invert() }
  return image
}
function cropMargin(image) {
  const data = image.getRawImage().data
  let max = -Infinity, min = Infinity
  for (let i = 0; i < data.length; i++) { if (data[i] > max) max = data[i]; if (data[i] < min) min = data[i] }
  if (max === min) return image
  const threshold = 200
  let minX = image.width, minY = image.height, maxX = 0, maxY = 0
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const idx = y * image.width + x
      const normalized = ((data[idx] - min) / (max - min)) * 255
      if (normalized < threshold) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return image
  return image.crop({ origin: { row: minY, column: minX }, width: maxX - minX, height: maxY - minY })
}
function resize(image, height, width) {
  const [targetH, targetW] = [height, width]
  const minDim = Math.min(targetH, targetW)
  const scale = minDim / Math.min(image.height, image.width)
  let newW = Math.round(image.width * scale)
  let newH = Math.round(image.height * scale)
  if (newW > targetW || newH > targetH) {
    const ratio = Math.min(targetW / newW, targetH / newH)
    newW = Math.round(newW * ratio)
    newH = Math.round(newH * ratio)
  }
  const resized = image.resize({ width: newW, height: newH })
  const padW = Math.floor((targetW - newW) / 2)
  const padH = Math.floor((targetH - newH) / 2)
  const output = new Image(targetW, targetH, { colorModel: resized.components === 1 ? 'GREY' : 'RGB' })
  output.fill(0)
  for (let y = 0; y < resized.height; y++) {
    for (let x = 0; x < resized.width; x++) {
      for (let c = 0; c < resized.components; c++) {
        const srcIdx = (y * resized.width + x) * resized.components + c
        const dstIdx = ((y + padH) * targetW + (x + padW)) * output.components + c
        output.data[dstIdx] = resized.data[srcIdx]
      }
    }
  }
  return output
}
function normalize(image) {
  const grey = image.components === 1 ? image : image.grey()
  const data = grey.getRawImage().data
  const normalized = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) normalized[i] = (data[i] / 255.0 - MEAN) / STD
  return normalized
}
// ===== 复刻结束 =====

async function preprocess(pngBuffer) {
  let img = decode(pngBuffer)
  if (img.alpha) {
    const flat = new Image(img.width, img.height, { colorModel: 'RGB' })
    flat.fill(255)
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const px = img.getPixel(x, y)
      const a = px[3] / 255
      const out = [0, 1, 2].map(c => Math.round(px[c] * a + 255 * (1 - a)))
      flat.setPixel(x, y, out)
    }
    img = flat
  }
  img = img.grey()
  img = reverseColor(img)
  img = cropMargin(img)
  img = resize(img, 384, 384)
  return normalize(img)
}

console.log('loading model...')
const model = await VisionEncoderDecoderModel.from_pretrained('xzpdyy/pailishi-model', { dtype: 'fp32' })
const tokenizer = await PreTrainedTokenizer.from_pretrained('xzpdyy/pailishi-model')
console.log('ready\n')
const cases = [
  ['f0_printed.png', '印刷体对照（站点示例图）'],
  ['f1_poly.png', '手写 x^2 + 2x + 1 = 0'],
  ['f2_frac.png', '手写 1/2'],
  ['f3_sqrt.png', '手写 √(x+1)'],
  ['f4_linear.png', '手写 y = kx + b'],
  ['f5_int.png', '手写 ∫₀¹ x² dx']
]
for (const [f, label] of cases) {
  const buf = fs.readFileSync(f)
  const arr = await preprocess(buf)
  const tensor = new Tensor('float32', arr, [1, 1, 384, 384])
  const pv = cat([tensor, tensor, tensor], 1)
  const outputs = await model.generate({ inputs: pv })
  const text = tokenizer.batch_decode(outputs, { skip_special_tokens: true })[0]
  console.log('[' + label + '] →', JSON.stringify(text.slice(0, 150)))
}
