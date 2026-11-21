// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // 评测脚本（docs/superpowers/handwriting-eval/）是一次性 spike 工具，
    // 刻意紧凑的写法不走站点 lint 规范，忽略之避免破坏 lint 基线
    ignores: ['docs/superpowers/handwriting-eval/**']
  }
)
