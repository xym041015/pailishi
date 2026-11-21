# 识别历史（本地，无需登录）设计文档

日期：2026-11-16 · 状态：已与用户逐节确认（设计对话 2026-11-16） · 上游依据：提示词 v2 候选清单 #3（2026-10-30 批准）

## 1. 背景与目标

识别历史 = 最近识别成功的公式自动保存在**本浏览器**（localStorage），可随时找回 LaTeX。与 SimpleTex 的差异点：**无需登录、不上云、本地免费**。它是首页功能卡④「识别历史 · 本地保存最近的识别记录」（现为虚线占位）的兑现。

成功标准：
- /ocr 与 /write 的每次识别成功自动进入历史（含缩略图、LaTeX、引擎、时间、来源）
- 点击历史条目 → LaTeX 回到源码区（可编辑/复制/导出）
- 30 条 FIFO、配额超限自动淘汰，隐私模式等极端情况不影响识别主流程
- 移动端可用

## 2. 范围

**v1 做**：`useRecognitionHistory` 存储 composable（TDD）、`makeThumb` 缩略图生成、`HistoryDrawer` 抽屉组件、useRecognize 写入点、/ocr 与 /write 入口接线、首页功能卡④实线（`/ocr?history=1` 自动展开）、i18n。
**v1 不做**：原图完整存档（IndexedDB）、缩略图重新识别、搜索/筛选、导出历史、跨设备同步（明确不做：账户/上云）。
**v2 候选**：IndexedDB 存原图 + 历史条目重识别；按引擎/来源筛选；导出全部为 txt。

## 3. 架构与数据流

```
useRecognize.runOCR 成功且输出非空（/ocr 与 /write 共用收口）
  → makeThumb(file)（128px JPEG dataURL；解码失败 → null）
  → useRecognitionHistory.add({ latex, thumb, engine, source })
  → localStorage 'pailishi-history-v1'
HistoryDrawer（Teleport UModal，/ocr 与 /write 各挂一份）
  → 点条目 emit restore(latex) → 源码区 latexCode.value = latex（现有文本撤销栈接管）
```

## 4. 组件设计

### 4.1 `app/composables/useRecognitionHistory.ts`（存储 composable，TDD）

- key：`pailishi-history-v1`
- 条目：`{ id: string(`${Date.now()}-${rand}`), ts: number, latex: string, thumb: string | null, engine: string, source: 'ocr' | 'write' }`
- API：
```ts
export interface HistoryItem { id: string; ts: number; latex: string; thumb: string | null; engine: string; source: 'ocr' | 'write' }
export interface HistoryStorage {                    // 可注入（测试用）
  read(): string | null
  write(s: string): boolean                          // false = QuotaExceeded
}
export function useRecognitionHistory(storage?: HistoryStorage, max: number = 30): {
  items: Ref<HistoryItem[]>                          // 新在前
  add(entry: { latex: string; thumb: string | null; engine: string; source: 'ocr' | 'write' }): void
  remove(id: string): void
  clear(): void
}
```
- 语义：add 置顶；与 items[0].latex（trim 后）相同 → 跳过；超 max 淘汰尾部；**write 返回 false（配额超限）→ pop 最旧重试，循环至写入成功或列表为空**
- 全部存储操作 try-catch（localStorage 被禁用 → composable 退化为内存会话态，识别主流程不受影响）
- 默认单例存储：包一层 try 的 localStorage 适配器

### 4.2 `app/utils/makeThumb.ts`（缩略图生成）

`makeThumb(file: File): Promise<string | null>`——createImageBitmap → OffscreenCanvas/常规 canvas 白底打平 → 等比缩到宽 128px → JPEG 0.75 → dataURL；任何异常 → null。宽 <128 的图原尺寸不放大。

### 4.3 `app/components/HistoryDrawer.vue`（抽屉组件）

- props：`{ open: boolean, items: HistoryItem[] }`；emits：`update:open`、`restore(latex: string)`、`remove(id: string)`、`clear()`
- 列表项：缩略图 48px（thumb null → Σ 占位图标）+ LaTeX 两行截断（mono）+ 底行（时间短格式 `MM-DD HH:mm` · 引擎徽章 · 来源徽章）+ 右上 × 删除
- 点条目主体 → `restore(latex)` + 关闭抽屉；× → stopPropagation 只删该条
- 顶部：标题「识别历史」+ 条数徽章 + 「清空全部」按钮（二次点击确认模式，3s 超时还原）
- 空态：Σ 图标 + `history_empty` 文案；存储不可用同样显示空态

### 4.4 写入点：`useRecognize.runOCR`

成功路径（输出非空、成功 toast 之后）：生成缩略图 → `history.add({ latex, thumb, engine: 引擎显示名, source })`。source 需要页面身份 → `useRecognize` 增加可选构造参数 `{ source?: 'ocr' | 'write' }`（ocr.vue 传 'ocr'，write.vue 传 'write'）。缩略图生成失败不阻断识别主流程。

引擎显示名：本地 → t('write_engine_local') 同源的「本地模型」；云端 → 供应商显示名（与 SettingsDrawer 同源规则：预设 label / 自定义 config.name）。

### 4.5 页面接线

- **ocr.vue**：`InputBand` 加历史图标按钮（`i-lucide-history`，与齿轮并列，新增 emit `history`）→ `showHistory = true`；挂 `HistoryDrawer`；restore → `latexCode.value = latex`（现有 watch 自动进文本撤销栈）；onMounted 读 `route.query.history === '1'` → `showHistory = true`
- **write.vue**：引擎 pill 左侧同款历史图标按钮 + `HistoryDrawer`；restore → `latexCode.value = latex`
- **index.vue**：功能卡④ `{ icon: 'i-lucide-history', to: '/ocr?history=1', wip: false }`（name/desc 键已有）
- **InputBand.vue**：新增 emit `history` + 图标按钮（位置：settings 左侧）

## 5. i18n（zh/en 成对）

`history_title`（识别历史 / Recognition history）、`history_empty`（还没有识别记录，识别成功后自动保存在本浏览器 / No records yet — successful recognitions are saved in this browser）、`history_clear`（清空全部 / Clear all）、`history_clear_confirm`（确认清空？/ Tap again to clear）、`history_source_ocr`（工作台 / Workspace）、`history_source_write`（手写板 / Handwriting board）、`history_items`（{n} 条 / {n} items）。

## 6. 错误处理

- localStorage 禁用/异常 → 内存会话态 + 空态 UI，识别主流程零影响
- QuotaExceeded → 淘汰重试（§4.1）
- 缩略图生成失败 → thumb null → 占位图标
- 识别失败/空输出/模型未就绪 → 不写历史（写入点只在成功路径）

## 7. 测试与验收

- **TDD（vitest）**：add 置顶 / FIFO 淘汰 / 相邻去重 / remove / clear / QuotaExceeded 淘汰重试（注入 fake storage）/ localStorage 抛异常退化内存态
- **手动验收**：/ocr 识别成功 → 打开抽屉见条目（缩略图+文本+引擎+来源徽章）→ 点条目恢复进源码区 → /write 同链路（source 徽章=手写板）→ 清空/单删 → 首页卡④点击 → /ocr 自动展开抽屉 → 深浅两模式 → 手机端抽屉可用
- **computer-use 回归**：/ocr 识别 → 抽屉截图 → 恢复操作截图

## 8. v2 候选（记录，不做）

IndexedDB 存原图 + 条目重识别；按引擎/来源筛选；导出全部；条目数量设置。
