# TexTeller 第二本地引擎（手写增强）设计文档

日期：2026-11-22 · 状态：已与用户逐节确认（设计对话 2026-11-22） · 上游依据：v2 路线（用户提出本地模型手写升级）；2026-11-16 手写可行性 spike 与调研结论

## 1. 背景与目标

用户实测：部署的 20M 本地引擎（Texo-distill，印刷体为主）对**手写字很难识别**。调研结论：TexTeller（298M 参数，ViT+TrOCR，80M 图文对含大规模手写混合训练）在手写公式上 ExpRate CROHME14 88.0% / CROHME16 85.9% / CROHME19 85.8% / **HME100K（中文手写作业）90.7%**，为此前 SOTA（~63-67%）的大幅超越；官方 ONNX 量化版（apache-2.0）可直接进 transformers.js 栈。

**目标**：把 TexTeller 接入为**第二本地引擎**（手写增强），/ocr（手写作业照片上传）与 /write（手写板）都可用；现有 20M 引擎保留为快速档；云端引擎不变。**不需要自己训练**（TexTeller 作者已完成 2688 A800 小时的规模化训练）。

## 2. 范围

**v1 做**：模型仓库量化组装与 HF 上传（一次性）；本地引擎模型档案抽象（constants）；imageProcessor 预处理参数化；OCR worker 引擎切换（重建会话）；SettingsDrawer 本地分组两卡 + 下载进度；/write 推荐横幅；i18n；测试与部署。
**v1 不做**：WebGPU 加速调优（WASM 先行，实测后 v2）、双模型同时驻留、历史条目重识别、TexTeller 微调。
**明确不做**：云端上传类新依赖（引擎体系不变）。

## 3. 模型仓库（一次性准备，controller 执行）

- 源：`OleehyO/TexTeller`（fp32：encoder_model.onnx 343.6MB + decoder_model_merged.onnx 909.2MB + config/tokenizer 全套）
- 量化：`onnxruntime.quantization.quantize_dynamic` → encoder int8（≈88MB）+ decoder_model_merged int8（≈230MB）
- 组装 `xzpdyy/pailishi-handwrite`（transformers.js 布局）：`config.json`（来自 onnx-community/TexTeller-ONNX 的标准 VXD 配置）、`generation_config.json`、tokenizer 全套（tokenizer.json/tokenizer_config.json/special_tokens_map.json/added_tokens.json/vocab.json/merges.txt）、`onnx/encoder_model_int8.onnx`、`onnx/decoder_model_merged_int8.onnx`
- 上传：hf CLI（用户已登录）→ 站点经 `/hf/*` 同源代理分发（`remotePathTemplate: hf/{model}/resolve/{revision}`）
- 质量门槛：量化后用 handwriting-eval 基准（9 图）复跑，输出与 fp32 spike 一致（结构正确率 5/5，完美 ≥2）方可发布

## 4. 引擎系统抽象（核心改动）

### 4.1 模型档案（`constants.ts`）

```ts
export interface LocalModelConfig {
  id: 'formula' | 'handwrite'
  nameKey: string               // i18n 键（页面用 t(nameKey) 取显示名）
  repo: string                  // 'xzpdyy/pailishi-model' | 'xzpdyy/pailishi-handwrite'
  files: string[]               // transformers.js 加载清单
  preprocess: { size: 384 | 448; padGray: 0 | 255 }  // formula: 384/黑0；handwrite: 448/白255（两者同为 resize-fit + 居中 pad，仅参数不同）
export const LOCAL_MODELS: Record<'formula' | 'handwrite', LocalModelConfig>
```

（formula 档案 = 现有 ModelList 行为原样；handwrite 档案 = TexTeller int8 布局。）

### 4.2 `engineSettings`

`engineSettings.localModel: 'formula' | 'handwrite'`（新增字段，默认 `'formula'`；旧 localStorage 无此字段 → 默认值，向后兼容）。`cloudOCR.ts` 的 `EngineSettings` 类型与 `loadEngineSettings/saveEngineSettings` 同步扩展该字段。SettingsDrawer 本地分组渲染两张卡，选中态 = `engine === 'local' && localModel === x`。

### 4.3 `imageProcessor` 预处理参数化

`preprocessImg(file, model: LocalModelConfig)`：size/pad 色按档案（formula = 现行为逐字保留；handwrite = 448、白 255 pad——**TexTeller spike 实测有效**的「cropMargin → resize fit → 白 pad 居中」流程）；cropMargin/reverseColor/normalize(0.7931, 0.1738) 共用。输出通道 = 1（两模型都是灰度输入）。

### 4.4 OCR worker 引擎切换

`OCR.ts`/worker：`init(model_config)` 已按 ModelConfig 加载；引擎切换（或首次选 handwrite）时若目标档案 ≠ 当前已加载档案 → **terminate 现有 worker 并重建**（WorkerProxy 模式下 = ocr.vue/write.vue 重建 OCR 实例）。`isReady/progress` 随新实例重置；`useModelLoadingToast` 重新展示下载进度。两页共用同一引擎设置，切换入口 = SettingsDrawer。

### 4.5 UI

- SettingsDrawer 本地分组两张卡（radio 语义同现有）：「本地快速 · 印刷体优先（已下载 80MB）」/「本地手写增强 · 手写优先（约 318MB，首次使用下载）」；选中 handwrite 且未加载 → 卡上显示「首次使用将下载约 318MB」
- /write 推荐横幅：`engine === 'local' && localModel === 'formula'` 时显示「手写识别推荐切换手写增强引擎（更准，约 318MB 下载一次）」+ 切换按钮（写入 settings 并触发加载）
- /ocr 不加横幅（照片以印刷为主，用户自选）
- 引擎 pill（write.vue）/设置抽屉显示当前本地模型名

## 5. 数据流（不变的部分）

识别管线、useRecognize、HistoryDrawer、useFormulaActions、复制/导出全部复用——唯一变化 = 传给管线的是哪个 LocalModelConfig。历史记录的 engine 字段将区分「本地快速/手写增强/云端名」（引擎显示名 helper 已就绪）。

## 6. 错误处理

- handwrite 模型下载中断 → 现有进度 toast + 重试（切回 formula 引擎可立即工作）
- int8 量化后某张图识别输出为空 → 与现有空输出路径一致（toast + 不写历史）
- QuotaExceeded 类存储问题不涉及（模型走 Cache API，历史走 localStorage，互不影响）
- 引擎切换过程中「重新识别」点击 → recognizing 状态互斥（现有 recognizing ref 挡住）

## 7. 测试与验收

- **TDD**：LOCAL_MODELS 档案表结构、engineSettings localModel 默认与持久化、imageProcessor 预处理参数化（384 黑 pad vs 448 白 pad 方形——用注入的小图断言输出尺寸/底色/通道）
- **基准回归**：handwriting-eval 9 图——handwrite 引擎（int8）结构正确 ≥5/5、完美 ≥2/5（对齐 fp32 spike）；formula 引擎跑印刷样张无回归
- **手动/computer-use**：SettingsDrawer 切 handwrite → 下载进度 → /write 手写识别（延迟实测披露）→ 历史条目引擎徽章 = 手写增强；/ocr 上传手写作业照片 → 识别对比；切回 formula → 印刷识别无回归；深浅两模式
- **部署铁律**：本地 generate 全量 + 四页 curl

## 8. 风险与预期

- 浏览器 WASM 推理延迟预计 1-5s/公式（M5 实测 CPU 0.9s/张 fp32；WASM 量化通常同量级偏慢；WebGPU 留 v2）——UI 有识别中 toast，可接受
- int8 量化精度：验收基准门槛兜底（§7）
- 318MB 首次下载：卡片明示 + 下载一次永久缓存 + 随时可切回快速档
