# 拍立式 SnapLaTeX

公式截图 → LaTeX → Word 可编辑公式。完全在浏览器本地运行，无需后端，图片不上传。

基于 [alephpi/Texo-web](https://github.com/alephpi/Texo-web)（AGPL-3.0）深度改造，识别模型为 [alephpi/Texo](https://github.com/alephpi/Texo)（20M 参数）。

## 功能

- 📸 **四种输入**：⌘V 粘贴截图 · 拖入图片 · 点击上传 · 系统截图快捷键
- 🔒 **本地识别**：模型在你的浏览器里运行（首次下载 ~80MB 后缓存），图片不上传
- 📋 **三种输出**：复制成 Word 可编辑公式 / 复制 LaTeX / 导出 .docx
- ☁️ **BYO key 高精度通道**：支持 OpenAI 兼容接口（含通义千问/智谱/硅基流动/豆包/Kimi 等 8 家预设）和 SimpleTex，key 只存你自己浏览器里
- 🌐 **中英双语** / 移动端响应式 / PWA

## 部署

```bash
pnpm install
pnpm build
```

构建产物在 `.output/`，可部署到任何支持 Node.js 或静态托管的海绵体（Cloudflare Pages / Vercel / Netlify 等）。

推荐 Cloudflare Pages Git 集成：推到 GitHub → Cloudflare Pages → Connect to Git → 框架选 Nuxt → 部署。

## 识别模型来源

模型自托管在 [xzpdyy/pailishi-model](https://huggingface.co/xzpdyy/pailishi-model)：
- 海外用户从 huggingface.co 加载
- 国内用户自动切换到 hf-mirror.com 镜像

## License

AGPL-3.0（继承自基座 [Texo-web](https://github.com/alephpi/Texo-web)）
