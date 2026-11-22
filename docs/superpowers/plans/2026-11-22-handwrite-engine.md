# TexTeller 第二本地引擎实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第二本地引擎「手写增强（TexTeller int8）」——/ocr 与 /write 可切换；手写/照片手写识别大幅提升（CROHME 88% / HME100K 90.7%）。

**Architecture:** 本地引擎模型档案化（constants.ts LOCAL_MODELS：repo/files/预处理参数）；engineSettings 增 localModel 字段；imageProcessor 按档案参数化；OCR worker 按引擎重建会话；SettingsDrawer 本地分组两卡 + /write 推荐横幅。模型仓库（int8 量化 + HF 上传）为 controller 前置任务。

**Tech Stack:** Nuxt 3 + pnpm + vitest（既有）、onnxruntime quantization（prep，python）、hf CLI（上传）。

**Spec:** `docs/superpowers/specs/2026-11-22-handwrite-engine-design.md`

## Global Constraints

- 现有 formula 引擎行为逐字不变（默认引擎、384 黑底管线、/ocr /write 现有交互）
- 预处理共用框架：cropMargin/reverseColor/normalize(0.7931, 0.1738) 不动，仅 size/pad 色按档案
- docx 式动态 import 约定不涉及；不引入新 npm 依赖
- localStorage key 不变（engineSettings 加 localModel 字段向后兼容）
- i18n zh/en 成对；提交信息中文；push 重试最多 8 次
- 部署前本地 `pnpm run generate` 全量 + 四页 curl 铁律；int8 模型基准回归（handwriting-eval）达标才发布

---

### Task 0（controller 前置，非子代理）: 模型仓库量化组装 + HF 上传

步骤见 spec §3。产出 = `xzpdyy/pailishi-handwrite` 仓库（transformers.js 布局，int8）。质量门槛 = handwriting-eval 基准复跑一致。**上传前需用户确认**。完成标志：`https://hf-mirror.com/xzpdyy/pailishi-handwrite/resolve/main/onnx/encoder_model_int8.onnx` 200。

---

### Task 1: 引擎档案表 + engineSettings.localModel + SettingsDrawer 本地分组

**Files:**
- Modify: `app/composables/constants.ts`（LOCAL_MODELS 档案表 + ModelConfig 类型扩展）
- Modify: `app/composables/cloudOCR.ts`（EngineSettings 增 localModel 字段 + load/save 默认值）
- Modify: `app/components/SettingsDrawer.vue`（本地分组两张卡）
- Test: `app/composables/__tests__/localModels.test.ts`

**Interfaces:** Produces（后续任务消费）:

```ts
// constants.ts
export type LocalModelId = 'formula' | 'handwrite'
export interface LocalModelConfig {
  id: LocalModelId
  nameKey: string                        // i18n 键
  repo: string                           // 'xzpdyy/pailishi-model' | 'xzpdyy/pailishi-handwrite'
  files: string[]                        // transformers.js 加载清单（含 onnx int8 文件名）
  preprocess: { size: 384 | 448; padGray: 0 | 255 }
}
export const LOCAL_MODELS: Record<LocalModelId, LocalModelConfig>
// cloudOCR.ts
export interface EngineSettings { ...既有..., localModel: 'formula' | 'handwrite' }
// loadEngineSettings 默认 'formula'；save 保留
```

SettingsDrawer 本地分组（现有「本地模型 · 免费」radio 位置改为两张卡）：
- 卡 A：`t('engine_local_formula')` + 小字「印刷体优先 · 已含在首次下载」
- 卡 B：`t('engine_local_handwrite')` + 小字「手写/照片手写优先 · 约 318MB 下载一次」
- 选中逻辑：卡 A = `settings.engine==='local' && settings.localModel==='formula'`；卡 B = `...localModel==='handwrite'`；点击 → emit save（engine 保持 'local'，localModel 变更）
- 云端卡行为不变；`getActiveCloudProvider` 不受影响（localModel 只在 engine==='local' 时被引擎路由读取）

- [ ] **Step 1: 写失败测试**（localModels.test.ts）：LOCAL_MODELS 两个档案字段齐全（repo/files/preprocess 值断言）；EngineSettings 默认 localModel='formula'；load 旧数据（无 localModel 字段）→ 默认 formula
- [ ] **Step 2: 跑测试确认失败**
- [ ] **Step 3: 实现**（constants.ts 档案表；cloudOCR.ts EngineSettings + load 兼容；SettingsDrawer 两卡——样式照抄现有 radio 卡，副文案换）
- [ ] **Step 4: `pnpm test` + `pnpm lint` + `pnpm run generate`（/ocr /write 内容标识不变）**
- [ ] **Step 5: Commit** `git commit -m "本地引擎档案化：LOCAL_MODELS + engineSettings.localModel + 设置抽屉本地分组"`

---

### Task 2: imageProcessor 预处理参数化 + worker 引擎切换

**Files:**
- Modify: `app/composables/workers/imageProcessor.ts`（preprocessImg 接受 preprocess 参数）
- Modify: `app/composables/workers/ocr.ts`（predict 用 model_config.preprocess；worker 支持 re-init）
- Modify: `app/composables/OCR.ts`（reset/re-init 支持）
- Modify: `app/composables/useRecognize.ts`（按 engineSettings.localModel 选档案；引擎切换时重建）
- Modify: `app/composables/constants.ts`（ModelConfig 增加 preprocess 字段——或直接引用 LOCAL_MODELS）

**Interfaces:** Consumes: Task 1 LOCAL_MODELS/EngineSettings。Produces: `useRecognize({ t, toast, source })` 内部按 `engineSettings.localModel` 解析 LOCAL_MODELS 档案并保证 worker 会话匹配（档案变化 → 重建）；`runOCR(file, engineSettings)` 行为不变。

- [ ] **Step 1: imageProcessor 参数化**

`preprocessImg(file, pre = { size: 384, padGray: 0 })`：现逻辑中 `resize(image, 384, 384)` → `resize(image, pre.size, pre.size)`；`output.fill(0)` → `output.fill(pre.padGray)`；reverseColor 仅在 `padGray === 0` 时执行（白 pad 手写管线不反转——与 TexTeller spike 一致）；cropMargin 保留。worker 的 predict 调用处传 `model_config.preprocess`。

- [ ] **Step 2: OCR 类 re-init**

`OCR.ts`：新增 `async reload(model_config)`——`terminate()` 现有 worker → `_initialized = false` → 重建 worker → `init(model_config)`。WorkerProxy 检查 terminate 后事件监听重建（以现行实现为准，若 terminate 复杂则整实例替换：useRecognize 持有 OCR 实例改为 `let ocr: OCR`，档案变化时 `ocr = new OCR()`）。

- [ ] **Step 3: useRecognize 引擎路由扩展**

```ts
const localModelId = computed(() => engineSettings.engine === 'local' ? engineSettings.localModel : null)
let loadedModelId: 'formula' | 'handwrite' | null = null
// runOCR 本地分支：
const lm = LOCAL_MODELS[engineSettings.localModel]
if (loadedModelId !== engineSettings.localModel) { await loadModel(configFor(lm)); loadedModelId = engineSettings.localModel }
if (!isReady.value) throw ...（现有文案，体积按档案区分）
const result = await predict(input)  // worker 内 preprocess 用 model_config.preprocess
```

（engineSettings 通过 runOCR 参数传入——现有签名 `runOCR(file, engineSettings)` 已满足 ✓；ModelConfig 构造 = constants.ts 现有 useSource/model_config 组装模式，增加 preprocess 与 repo 指向。）

- [ ] **Step 4: 回归**：`pnpm test`（既有全绿）+ `pnpm lint` + `pnpm run generate`
- [ ] **Step 5: Commit** `git commit -m "预处理参数化 + 本地引擎档案切换（worker 重建）"`

---

### Task 3: /write 推荐横幅 + i18n + 引擎显示名

**Files:**
- Modify: `app/pages/write.vue`（推荐横幅 + 引擎 pill 文案）
- Modify: `app/pages/ocr.vue`（无 UI 变化——引擎跟随设置）
- Modify: `i18n/locales/zh-CN.json`、`en.json`

- [ ] **Step 1: 横幅**：`v-if="engine==='local' && localModel==='formula'"` 荧光黄淡底条（同 history 黄条样式）：文案 `write_handwrite_banner`（zh「手写识别推荐切换手写增强引擎（更准，约 318MB 下载一次）」/ en 对应）+ 按钮「切换」（写入 engineSettings.localModel='handwrite' 并 save → 引擎 pill 更新）
- [ ] **Step 2: 引擎 pill 文案**：localModel==='handwrite' → `t('engine_local_handwrite')`；formula → 现有 write_engine_local 文案保持
- [ ] **Step 3: i18n 键**：`engine_local_formula`（本地快速 · 印刷体优先 / Local fast · print-first）、`engine_local_handwrite`（本地手写增强 · 手写优先 / Local handwriting-enhanced）、`write_handwrite_banner`、`write_handwrite_switch`（切换 / Switch）
- [ ] **Step 4: 回归**：`pnpm test` + `pnpm lint` + `pnpm run generate`
- [ ] **Step 5: Commit** `git commit -m "手写板推荐横幅 + 引擎显示名（本地双档）"`

---

### Task 5: 基准回归 + 部署 + 线上验证 + computer-use

- [ ] **Step 1: 基准回归**：handwriting-eval 9 图——handwrite 引擎（int8 部署版）结构正确 ≥5/5、完美 ≥2/5；formula 引擎印刷样张无回归
- [ ] **Step 2: push（重试环）→ 线上四页 curl**
- [ ] **Step 3: computer-use**：设置切 handwrite → 下载进度 → /write 手写识别（延迟实测）→ 历史引擎徽章 → 切回 formula 印刷回归 → 截图汇报

---

## Self-Review 记录

- Spec 覆盖：§4.1 → T1；§4.2 → T1；§4.3 → T2；§4.4 → T2；§4.5 → T1（抽屉）+ T3（横幅）；§5 数据流不变 ✓；§6 错误处理 → T2（recognizing 互斥）+ T5；§7 → T5；§8 → Task 0 预算披露。
- 占位符：无。providerDisplayName 等既有接口引用均已在仓库存在。
- 类型一致：LocalModelConfig（T1 定义 = T2 消费）；engineSettings.localModel（T1 = T2/T3）；HistoryDrawer/历史引擎名沿用已上线代码。
- 依赖顺序：T1 → T2 → T3 相互独立可并行审查但按序派发；T5 依赖 Task 0 完成（模型仓库上线）。
