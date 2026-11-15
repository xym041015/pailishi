# 手写板模式（/write）设计文档

日期：2026-11-15 · 状态：已与用户逐节确认（设计对话 2026-11-15） · 上游依据：提示词 v2 候选清单 #2（2026-10-30 批准）

## 1. 背景与目标

手写板模式 = 老师在手写板/触屏上直接写公式 → 识别为 LaTeX → 复制进 Word。它是首页功能卡③「手写板模式 · 手写公式直接识别」（现为虚线占位）的兑现，也是 SimpleTex「手写板」的对位功能——差异点：**我们本地免费、无需登录、图片不上传**。

### 1.1 可行性实测（Spike，2026-11-15）

部署的本地模型 = PP-FormulaNet-S 在 UniMER-1M（106 万样本，含 6.6 万手写 HWE）上的微调蒸馏版（ONNX 80MB，transformers.js 推理）。用 Node + 同款 image-js 预处理管线复刻推理，测真实手写（CROHME/HME100K 样本，来自 opendatalab/UniMERNet 仓库演示图）：

| 场景 | 结果 |
|---|---|
| 画板等效（真实手写笔画二值化到白底） | 5 样本：2 完美（分数加法、几何角度推理）+ 3 结构全对但数字/细节有误 |
| 合成工整手写（手写体字体） | 6 样本：5 完美，1 首测失败（画法问题，v2 画法完美） |
| 照片原图（灰纸/紫墨水/阴影） | 0/4 全崩：reverseColor 启发式误反色 + 超宽图压扁到 384px |

**结论**：画板场景（纯白底 + 工整笔画）本地模型可用，匹配「识别后人工核对」流程；照片手写本地不可用。**本地模型微调（HWE/CROHME）列入 v2**，v1 不做。spike 测试脚本 `/tmp/handtest`（Node + image-js 逐字复刻管线）留存为将来训练的评测基准雏形。

### 1.2 成功标准

- 鼠标/触屏画公式 → 识别 → 复制成 Word 公式 → Word 粘贴为原生公式，全程不离开 /write
- 工整手写本地识别可用（不低于 spike 基线），结果区常驻「建议人工核对」提示
- 未配置云端引擎的用户全程无拦截；已配置用户可一键切换云端对照
- 移动端触屏可写

## 2. 范围

**v1 做**：/write 页（画板 + 识别 + 结果区）、HandwritingBoard 组件、useFormulaActions 抽取、导航/首页接线、管线 colorModel bug 修复、i18n。
**v1 不做**：自动识别（停笔即识别）、符号修正面板（v2 候选 #4）、手写笔压感、多色笔画、识别历史（v2 候选 #3）、本地模型微调（v2，见 §8）。
**明确不做**（沿提示词红线）：账户、排队、付费、PDF 等。

## 3. 架构与数据流

```
HandwritingBoard.vue（canvas 画板）
  → toBlob PNG → File('handwritten-<ts>.png')
  → 现有识别管线（preprocessImg → useOCR 引擎路由：本地 / SimpleTex / OpenAI）
  → latexCode
  → PanelSource（源码 + 复制按钮组，useFormulaActions）+ PanelPreview（KaTeX/Mathlive）
```

管线零改动（只换输入形态）；引擎选择复用现有 localStorage 配置（`pailishi-engine`）与 `SettingsDrawer`。

## 4. 组件设计

### 4.1 `app/pages/write.vue`

备课纸风格（pk-* token）。上下流式布局，桌面与移动端同一结构：

1. 画板区（最大宽 860px，高约 400px / 移动端 300px）
2. 工具条：笔 3 档（细3/中6/粗10 逻辑像素）| 橡皮 | 撤销 | 重做 | 清空；「识别」主按钮（pk-btn solid，空画板禁用）置于工具条右端
3. 引擎 pill：显示当前引擎名，点击打开 `SettingsDrawer`（复用组件）
4. 结果区：PanelSource + PanelPreview 两栏（移动端单列）
5. 图注式说明（pk-fig-no 风格）

### 4.2 `app/components/HandwritingBoard.vue`

- **Pointer Events** 统一鼠标/触屏/触控笔；`touch-action: none`；`pointercancel` 收笔；`getCoalescedEvents` 采点（可选增强）
- 笔画 = 点列数组（逻辑坐标），渲染 = 圆头线帽线段；内部分辨率 × devicePixelRatio
- 撤销/重做 = 笔画栈 + 全量重绘；橡皮 = 笔画级擦除（点命中笔画包围盒即删整笔，不做像素擦除）
- 导出：`toBlob('image/png')` 白底（画板即白底，管线自带 cropMargin，无需额外裁剪）；空画板导出前由父组件禁用按钮
- 空态：中央浅灰提示「在这里写公式，写完点识别」，落笔消失
- emits：`change(isEmpty)`；expose：`exportPng(): Promise<Blob|null>`、`clear()`
- 深色模式：画板**永远白底黑笔画**（它是纸；页面外框随主题）

### 4.3 `app/composables/useFormulaActions.ts`（抽取）

从 `ocr.vue` 抽出 `copyWordFormula`（ClipboardItem 双 flavor）、`copyLatex`、`exportDocx`（动态 import docx 不变），参数化 latexCode 与 toast 调用。ocr.vue 改为调用该 composable，行为不变（回归点：工作台三个按钮）。

### 4.4 引擎策略（v1）

- 识别按钮永远可点；引擎 = 当前设置（本地默认）
- 本地引擎结果区**常驻黄条**：「手写识别建议人工核对；潦草字迹可在设置中切换云端引擎对照」
- 云端引擎（SimpleTex 标准 / OpenAI）照常带置信度徽章（绿 ≥80 / 橙 <80）
- 模型未下载：点识别走现有进度 toast + 中断重试链路

## 5. 管线修复（spike 发现的真 bug）

`imageProcessor.ts`：`grey()` 之前若 `colorModel` 非 RGB/RGBA（某些 PNG/JPEG 解码产物）会抛 `image colorModel must be RGB or RGBA`——线上传图报错源之一。修复：进入预处理即 `convertColor('RGB')`（image-js v2 API），RGBA 带 alpha 时仍保留白底打平逻辑（canvas 路径已有；decode 路径补齐）。

`reverseColor` 对照片的误反色：v1 **不动**（触碰印刷识别精度基线；画板场景纯白底不触发）。照片手写的正确出路 = 云端引擎。

## 6. 接线清单

1. `AppHeader.vue`：导航加「手写板」项（/write 高亮逻辑与现有一致；小屏 px-2 text-[13px] 跟随）
2. `index.vue` 功能卡③：`wip: true` → 实线 `to: '/write'`
3. `index.vue` 「能拍什么」手写体卡 ※ 注记改写：「本地引擎即可识别手写公式（工整字迹准）；潦草字迹建议在设置里开启云端引擎对照」
4. `nuxt.config.ts`：`nitro.prerender.routes` += `/write`
5. i18n `zh-CN.json` / `en.json`：`write_title`、`write_board_hint`、`write_recognize`、`write_engine_label`、`write_local_notice`、`write_undo`、`write_redo`、`write_clear`、`write_pen_thin/med/bold`、`write_eraser`、`write_caption` 等（zh/en 成对）
6. `AppHeader` 移动端宽度评估：5 项导航在 390px 下若溢出，「手写板」名称在 sm 以下可缩短为「手写」

## 7. 错误处理

- 空画板 → 识别按钮 disabled；`toBlob` 返回 null → toast 报错
- 模型下载中断/失败 → 现有进度 toast + 重试链路不变
- 云端报错 → 现有 toast + maskKey 脱敏不变
- 识别结果为空串（模型偶尔输出空）→ 视为失败，toast「未识别出内容，请写清楚一点或切换云端引擎」

## 8. v2 路线（本次不做，记录方向）

- **本地模型手写微调**：数据 = CROHME + HME100K（UniMER-Train 已含 6.6 万 HWE）；基线评测 = spike 脚本 `/tmp/handtest`（真实手写验收集 9 张 + 真值转写）；需要 GPU 训练环境与 ONNX 重导出，通过站点 `/hf/*` 同源代理分发
- 符号修正面板（v2 候选 #4）、识别历史（#3）、自动识别（停笔 1.5s）

## 9. 测试与验收

- **组件单测**（vitest）：笔画入栈/撤销/重做重绘、导出尺寸与白底、橡皮删除整笔
- **回归基准**：spike 验收集 9 张图跑本地引擎，结果不低于基线（≥2 完美、≥3 结构正确）
- **手动验收清单**：鼠标画→识别→复制成 Word 公式→Word 粘贴实测；iPhone 触屏手写；引擎切 SimpleTex 对照（置信徽章出现）；深浅两模式；空画板按钮禁用；`/write` 直接直达；首页功能卡可点；导航高亮
- 部署前：本地 `pnpm run generate` 全量预渲染 + 全站 curl 验证（/ /ocr/ /guide/ /write/ 铁律）
- 交付前：computer-use 全流程实操一遍（含手写画板）并截图
