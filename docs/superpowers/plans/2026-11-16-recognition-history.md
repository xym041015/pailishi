# 识别历史实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 识别成功自动存本地历史（缩略图+LaTeX+引擎+时间），工作台/手写板抽屉查看与恢复，无需登录。

**Architecture:** 存储纯逻辑 `useRecognitionHistory`（可注入 storage，TDD）+ 缩略图 `makeThumb`；写入点收口在 `useRecognize.runOCR` 成功路径（/ocr 与 /write 全覆盖）；`HistoryDrawer.vue`（USlideover，同 SettingsDrawer 惯例）挂在两页；首页卡④实线 → `/ocr?history=1` 自动展开。

**Tech Stack:** Nuxt 3 + pnpm + vitest（既有）、image-js（既有，本任务不用——缩略图走 canvas）。

**Spec:** `docs/superpowers/specs/2026-11-16-recognition-history-design.md`

## Global Constraints

- localStorage key `pailishi-history-v1`；最多 30 条 FIFO；相邻去重（与 items[0].latex trim 后相同则跳过）
- 所有存储操作 try-catch；localStorage 不可用 → 内存会话态，识别主流程零影响
- docx 式动态 import 约定不涉及本计划；**不得**引入新依赖
- 写入点只在识别**成功且输出非空**路径；失败/空输出/模型未就绪不记录
- i18n zh/en 成对；`empty_output` 等既有键不重复
- 提交信息中文；push 失败重试（最多 8 次、退避递增）
- 部署前本地 `pnpm run generate` 全量 + 线上四页 curl 铁律

---

### Task 1: useRecognitionHistory（TDD）+ makeThumb

**Files:**
- Create: `app/composables/useRecognitionHistory.ts`
- Create: `app/composables/__tests__/useRecognitionHistory.test.ts`
- Create: `app/utils/makeThumb.ts`

**Interfaces:** Produces（Task 2/3 消费，签名固定）:

```ts
export interface HistoryItem {
  id: string; ts: number; latex: string
  thumb: string | null; engine: string; source: 'ocr' | 'write'
}
export interface HistoryStorage { read(): string | null; write(s: string): boolean }
export function useRecognitionHistory(storage?: HistoryStorage, max?: number): {
  items: Ref<HistoryItem[]>
  add(entry: { latex: string; thumb: string | null; engine: string; source: 'ocr' | 'write' }): void
  remove(id: string): void
  clear(): void
}
export async function makeThumb(file: File, width?: number): Promise<string | null>
```

- [ ] **Step 1: 写失败测试** `app/composables/__tests__/useRecognitionHistory.test.ts`：

```ts
import { describe, it, expect, vi } from 'vitest'
import { useRecognitionHistory, type HistoryStorage } from '../useRecognitionHistory'

function fakeStorage(opts: { failWritesOver?: number } = {}): HistoryStorage & { writes: number } {
  let data: string | null = null
  let writes = 0
  return {
    get writes() { return writes },
    read() { return data },
    write(s: string) {
      writes++
      if (opts.failWritesOver !== undefined && writes > opts.failWritesOver) return false
      data = s
      return true
    }
  }
}
const entry = (latex: string, engine = '本地') => ({ latex, thumb: null, engine, source: 'ocr' as const })

describe('useRecognitionHistory', () => {
  it('add 置顶且持久化', () => {
    const st = fakeStorage()
    const h = useRecognitionHistory(st)
    h.add(entry('a')); h.add(entry('b'))
    expect(h.items.value.map(x => x.latex)).toEqual(['b', 'a'])
    expect(st.writes).toBe(2)
    expect(JSON.parse(st.read()!).length).toBe(2)
  })

  it('相邻去重（trim 后相同跳过，只更新不落库不成立→直接跳过）', () => {
    const h = useRecognitionHistory(fakeStorage())
    h.add(entry(' x + 1 '))
    h.add(entry('x+1'))
    expect(h.items.value.length).toBe(1)
  })

  it('FIFO 淘汰到 max', () => {
    const h = useRecognitionHistory(fakeStorage(), 3)
    for (const s of ['1', '2', '3', '4']) h.add(entry(s))
    expect(h.items.value.map(x => x.latex)).toEqual(['4', '3', '2'])
  })

  it('QuotaExceeded：淘汰最旧重试直至写入成功', () => {
    const st = fakeStorage({ failWritesOver: 1 })  // 第 2 次写起失败
    const h = useRecognitionHistory(st, 10)
    h.add(entry('1'))
    h.add(entry('2'))                              // 写失败 → 淘汰 '1' → 重试成功
    expect(h.items.value.map(x => x.latex)).toEqual(['2'])
    expect(st.read()).toContain('2')
  })

  it('storage 抛异常退化为内存会话态', () => {
    const broken: HistoryStorage = { read() { throw new Error('no') }, write() { throw new Error('no') } }
    const h = useRecognitionHistory(broken)
    h.add(entry('x'))
    expect(h.items.value.length).toBe(1)           // 内存里有
  })

  it('remove / clear', () => {
    const st = fakeStorage()
    const h = useRecognitionHistory(st)
    h.add(entry('1')); h.add(entry('2'))
    h.remove(h.items.value[0].id)
    expect(h.items.value.length).toBe(1)
    h.clear()
    expect(h.isEmpty.value).toBe(true)
    expect(JSON.parse(st.read()!)).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**：`pnpm test` → FAIL（模块不存在）

- [ ] **Step 3: 实现** `app/composables/useRecognitionHistory.ts`：

```ts
import { computed, ref, type ComputedRef, type Ref } from 'vue'

export interface HistoryItem {
  id: string; ts: number; latex: string
  thumb: string | null; engine: string; source: 'ocr' | 'write'
}
export interface HistoryStorage { read(): string | null; write(s: string): boolean }

const KEY = 'pailishi-history-v1'

function defaultStorage(): HistoryStorage {
  return {
    read() { try { return localStorage.getItem(KEY) } catch { return null } },
    write(s: string) { try { localStorage.setItem(KEY, s); return true } catch { return false } }
  }
}

export function useRecognitionHistory(storage: HistoryStorage = defaultStorage(), max = 30) {
  const items: Ref<HistoryItem[]> = ref(load())

  function load(): HistoryItem[] {
    try {
      const raw = storage.read()
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }
  function persist() {
    // false = 配额超限 → 淘汰最旧重试直至成功或空；throw = 存储损坏 → 停止持久化，保留内存会话态
    try {
      while (items.value.length > 0) {
        if (storage.write(JSON.stringify(items.value))) return
        items.value.pop()
      }
    } catch { /* 存储不可用：仅内存 */ }
  }
  function add(entry: { latex: string; thumb: string | null; engine: string; source: 'ocr' | 'write' }) {
    const latex = entry.latex.trim()
    if (!latex) return
    if (items.value[0] && items.value[0].latex.trim() === latex) return  // 相邻去重
    items.value.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(), latex, thumb: entry.thumb, engine: entry.engine, source: entry.source
    })
    while (items.value.length > max) items.value.pop()
    persist()
  }
  function remove(id: string) {
    items.value = items.value.filter(x => x.id !== id)
    persist()
  }
  function clear() {
    items.value = []
    persist()
  }
  const isEmpty: ComputedRef<boolean> = computed(() => items.value.length === 0)
  return { items, isEmpty, add, remove, clear }
}
```

（注意：persist 全程 try 由 storage 实现内部处理；实现保持与测试注入契约一致。）

- [ ] **Step 4: 跑测试通过**：`pnpm test`（新增 6 例 + 既有全绿）

- [ ] **Step 5: 实现 makeThumb** `app/utils/makeThumb.ts`：

```ts
// 识别历史缩略图：白底打平 → 等比缩到宽 128 → JPEG dataURL；任何异常返回 null
export async function makeThumb(file: File, width = 128): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, width / bitmap.width)      // 小图不放大
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.75)
  } catch {
    return null
  }
}
```

- [ ] **Step 6: lint + Commit**

```bash
pnpm lint
git add app/composables/useRecognitionHistory.ts app/composables/__tests__/useRecognitionHistory.test.ts app/utils/makeThumb.ts
git commit -m "识别历史存储 composable（FIFO/去重/配额容错，TDD）+ 缩略图生成"
```

---

### Task 2: useRecognize 写入点 + 引擎显示名 helper

**Files:**
- Modify: `app/composables/useRecognize.ts`
- Modify: `app/utils/cloudOCR.ts`（新增 providerDisplayName 导出）
- Modify: `app/pages/write.vue`（引擎 pill 改用 providerDisplayName）

**Interfaces:** Consumes: Task 1 的 `useRecognitionHistory()` / `makeThumb(file)`；cloudOCR 既有 `getActiveCloudProvider` / `PROVIDER_PRESETS` / `customProviderName`（以现行文件为准）。Produces: `useRecognize(options: { t, toast, source?: 'ocr' | 'write' })`——新增可选 `source`；识别成功自动写历史。

- [ ] **Step 1: cloudOCR.ts 增加显示名 helper**（放在 customProviderName 附近；字段名以现行文件为准）：

```ts
// 历史记录/抽屉用的供应商显示名（与 SettingsDrawer 同源规则）
export function providerDisplayName(p: { id: string; config: { name?: string } }): string {
  const preset = PROVIDER_PRESETS.find(x => x.id === p.id)
  return p.config.name || preset?.label || p.id
}
```

（`PROVIDER_PRESETS`/`customProviderName` 的真实导出名以 app/utils/cloudOCR.ts 现行为准；write.vue 引擎 pill 现有同源逻辑改为调用本 helper，行为不变。）

- [ ] **Step 2: useRecognize.ts 接入**

```ts
import { useRecognitionHistory } from './useRecognitionHistory'
import { makeThumb } from '../utils/makeThumb'
import { providerDisplayName } from '../utils/cloudOCR'

export function useRecognize(options: { t: (k: string) => string; toast: ReturnType<typeof useToast>; source?: 'ocr' | 'write' }) {
  const source = options.source ?? 'ocr'
  const history = useRecognitionHistory()
  // ...既有代码...
  // 成功路径：confidenceValue 赋值之后、成功 toast 之后、return 之前：
  try {
    const engineName = cloudProvider ? providerDisplayName(cloudProvider) : t('write_engine_local')
    const thumb = await makeThumb(file)
    history.add({ latex: formatted, thumb, engine: engineName, source })
  } catch { /* 历史写入失败不阻断识别 */ }
  return formatted
}
```

注意：`formatted` 变量名以现行代码为准（Task 5 修复后空串 throw 在此之前）；本段必须放在**成功 toast 之后**（toast 响应优先）。`write_engine_local` 文案较长（含「手写建议人工核对」）——历史徽章需要短名：i18n 新键 `history_engine_local`：zh「本地」/ en "Local"，本地引擎时用 `t('history_engine_local')`。

- [ ] **Step 3: write.vue pill 改用 helper**：引擎显示链改为 `providerDisplayName(getActiveCloudProvider(...))`（行为不变，消重）。

- [ ] **Step 4: 回归**：`pnpm test`（6/6）+ `pnpm lint` + `pnpm run generate`（/ocr /write 内容标识不变）。

- [ ] **Step 5: Commit**

```bash
git add app/composables/useRecognize.ts app/utils/cloudOCR.ts app/pages/write.vue
git commit -m "识别成功自动写入本地历史（/ocr 与 /write 共用收口）+ 引擎显示名 helper"
```

---

### Task 3: HistoryDrawer.vue 抽屉组件

**Files:**
- Create: `app/components/HistoryDrawer.vue`

**Interfaces:** Consumes: `HistoryItem`（Task 1）。Produces:

```ts
defineProps<{ open: boolean, items: HistoryItem[] }>()
defineEmits<{ 'update:open': [v: boolean], restore: [latex: string], remove: [id: string], clear: [] }>()
```

- [ ] **Step 1: 实现组件**（USlideover 结构照抄 SettingsDrawer.vue 第 1-6 行惯例；列表项/空态/二次确认按 spec §4.3）：

```vue
<script setup lang="ts">
import type { HistoryItem } from '../composables/useRecognitionHistory'

defineProps<{ open: boolean, items: HistoryItem[] }>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  restore: [latex: string]
  remove: [id: string]
  clear: []
}>()

const { t } = useI18n()
const confirmClear = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function onClear() {
  if (!confirmClear.value) {
    confirmClear.value = true
    timer = setTimeout(() => { confirmClear.value = false }, 3000)
    return
  }
  if (timer) clearTimeout(timer)
  confirmClear.value = false
  emit('clear')
}
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

function fmt(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function onRestore(it: HistoryItem) {
  emit('restore', it.latex)
  emit('update:open', false)
}
</script>

<template>
  <USlideover :open="open" :title="t('history_title')" @update:open="$emit('update:open', $event)">
    <template #body>
      <div class="mb-3 flex items-center justify-between">
        <span class="rounded-full bg-[var(--pk-primary-soft)] px-2 py-0.5 text-xs text-[var(--pk-primary)]">{{ items.length }}</span>
        <button
          v-if="items.length"
          class="text-xs text-[var(--pk-muted)] hover:text-[var(--pk-primary)]"
          @click="onClear"
        >
          {{ confirmClear ? t('history_clear_confirm') : t('history_clear') }}
        </button>
      </div>
      <div v-if="!items.length" class="py-10 text-center">
        <span class="pk-serif text-3xl text-[var(--pk-muted)]">Σ</span>
        <p class="mt-3 text-xs leading-5 text-[var(--pk-muted)]">{{ t('history_empty') }}</p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="it in items"
          :key="it.id"
          class="group flex cursor-pointer gap-2.5 rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-2.5 hover:border-[var(--pk-primary)]"
          @click="onRestore(it)"
        >
          <img v-if="it.thumb" :src="it.thumb" class="h-12 w-12 shrink-0 rounded border border-[var(--pk-line)] object-cover" alt="">
          <span v-else class="pk-serif flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[var(--pk-line)] text-xl text-[var(--pk-muted)]">Σ</span>
          <div class="min-w-0 flex-1">
            <p class="line-clamp-2 break-all font-mono text-xs leading-4 text-[var(--pk-ink)]">{{ it.latex }}</p>
            <p class="mt-1.5 flex items-center gap-1.5 text-[10px] text-[var(--pk-muted)]">
              <span>{{ fmt(it.ts) }}</span>
              <span class="rounded bg-[var(--pk-primary-soft)] px-1.5 py-0.5 text-[var(--pk-primary)]">{{ it.engine }}</span>
              <span class="rounded bg-[var(--pk-edit-bg)] px-1.5 py-0.5">{{ it.source === 'write' ? t('history_source_write') : t('history_source_ocr') }}</span>
            </p>
          </div>
          <button
            class="h-6 w-6 shrink-0 rounded text-[var(--pk-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[#d4574e]"
            :aria-label="t('write_clear')"
            @click.stop="$emit('remove', it.id)"
          >
            <UIcon name="i-lucide-x" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </template>
  </USlideover>
</template>
```

- [ ] **Step 2: 冒烟**：`pnpm test` + `pnpm lint` + `pnpm run generate`（组件未被引用可编译）

- [ ] **Step 3: Commit**

```bash
git add app/components/HistoryDrawer.vue
git commit -m "识别历史抽屉组件（缩略图列表/恢复/单删/二次确认清空）"
```

---

### Task 4: 接线（InputBand / ocr / write / index / i18n）

**Files:**
- Modify: `app/components/InputBand.vue`（历史按钮 + emit）
- Modify: `app/pages/ocr.vue`（入口 + 抽屉挂载 + query 自动展开 + source 传参）
- Modify: `app/pages/write.vue`（历史按钮 + 抽屉挂载 + source 传参）
- Modify: `app/pages/index.vue`（feats④ 实线）
- Modify: `i18n/locales/zh-CN.json`、`i18n/locales/en.json`

**Interfaces:** Consumes: HistoryDrawer（Task 3）、useRecognitionHistory（Task 1，页面实例用于抽屉展示——注意与 useRecognize 内部实例**同 key 同 storage**，数据共享；页面实例仅读列表与 remove/clear）、Task 2 的 source 参数。Produces: 完整用户流。

- [ ] **Step 1: InputBand.vue**：emits 增加 `history: []`；settings 按钮左侧插同款按钮（类名照抄 settings 按钮，图标 `i-lucide-history`，tooltip `t('history_title')`，aria-label="history"，`@click="$emit('history')"`）

- [ ] **Step 2: i18n 两文件成对落键**：

```json
"history_title": "识别历史" / "Recognition history"
"history_empty": "还没有识别记录，识别成功后自动保存在本浏览器" / "No records yet — successful recognitions are saved in this browser"
"history_clear": "清空全部" / "Clear all"
"history_clear_confirm": "确认清空？" / "Tap again to clear"
"history_source_ocr": "工作台" / "Workspace"
"history_source_write": "手写板" / "Handwriting board"
"history_engine_local": "本地" / "Local"
```

- [ ] **Step 3: ocr.vue**：
  - `const route = useRoute()`；`const showHistory = ref(false)`；`const history = useRecognitionHistory()`
  - `useRecognize({ t, toast, source: 'ocr' })`（补 source）
  - InputBand 加 `@history="showHistory = true"`
  - 挂抽屉：`<HistoryDrawer v-model:open="showHistory" :items="history.items.value" @restore="onHistoryRestore" @remove="history.remove" @clear="history.clear" />`
  - `function onHistoryRestore(latex: string) { latexCode.value = latex }`（undo 栈由现有 watch 接管）
  - onMounted 末尾：`if (route.query.history === '1') showHistory.value = true`

- [ ] **Step 4: write.vue**：同款（历史按钮放引擎 pill 左侧；source: 'write'；restore → `latexCode.value = latex`）

- [ ] **Step 5: index.vue** feats④：`{ icon: 'i-lucide-history', name: t('home_feat4_name'), desc: t('home_feat4_desc'), to: '/ocr?history=1', wip: false }`

- [ ] **Step 6: 回归**：`pnpm test`（6/6）+ `pnpm lint` + `pnpm run generate`（15-16 routes；四页内容标识 grep 全过）

- [ ] **Step 7: Commit**

```bash
git add app/components/InputBand.vue app/components/HistoryDrawer.vue app/pages/ocr.vue app/pages/write.vue app/pages/index.vue i18n/locales/zh-CN.json i18n/locales/en.json
git commit -m "识别历史接线：/ocr 与 /write 抽屉入口 + 首页卡④实线 + query 自动展开 + i18n"
```

---

### Task 5: 部署 + 线上验证 + computer-use 回归

**Files:** 无新增

- [ ] **Step 1: push（重试环 8 次）**
- [ ] **Step 2: 线上轮询**：/write /ocr /guide / 四页 curl 标识全过
- [ ] **Step 3: computer-use 实操**：/ocr 识别一张 → 打开历史抽屉截图（缩略图+条目）→ 点条目恢复 → 源码区变化截图 → 首页卡④点击 → /ocr 抽屉自动展开截图 → /write 识别一条 → 抽屉里 source 徽章=手写板
- [ ] **Step 4: 汇报（含裁定清单）**

---

## Self-Review 记录

- **Spec 覆盖**：§4.1 → T1；§4.2 → T1；§4.3 → T3；§4.4 → T2；§4.5 → T4；§5 i18n → T4；§6 错误处理 → T1 实现+T5 验收；§7 测试 → T1 TDD + T5 手动/computer-use；§8 不实现。
- **占位符**：无 TBD；providerDisplayName 的 preset 字段名标注「以现行 cloudOCR.ts 为准」（防计划与代码漂移）。
- **类型一致性**：HistoryItem（T1 定义 = T2/T3 消费）一致；useRecognize options 增加 source（T2 定义 = T4 ocr/write 传参）一致；HistoryDrawer props/emits（T3 定义 = T4 消费）一致。
- **计划偏离预登记**：spec §5 的 history_items 键取消（计数用纯数字徽章）；`write_engine_local` 长文案不入历史徽章（新增 `history_engine_local` 短键）——两处均已在 Task 4/2 中体现。
