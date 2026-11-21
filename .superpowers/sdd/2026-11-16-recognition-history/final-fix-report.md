# 识别历史 Final Review 修复报告（2026-11-16 分支终审）

终审 findings 全量修复：I1–I4（Important）+ M-A（顺手）。M1–M5 按「不要动」清单保持现状。
回归：`pnpm test` 13/13 通过、`pnpm lint` 0 errors（3 条既有 v-html warning，非本次引入）、`pnpm run generate` 成功。

## 修复明细

### I1（Important）— /ocr?history=1 自动展开被模型加载链阻塞
- 文件：`app/pages/ocr.vue`（onMounted）
- 修法：`if (route.query.history === '1') showHistory.value = true` 从 `await useSource()` / `await recognizer.loadModel()` 之后移到 onMounted 顶部（`localStorage.getItem(DRAFT_KEY)` 草稿恢复之后），不依赖任何 await。
- 效果：useSource 两源不可达 throw 不再阻断/阻塞抽屉展开，模型冷启动期间抽屉即时可见。

### I2（Important）— 抽屉打开期间的写入被 remove/clear 覆盖丢失（双实例 lost-update）
- 文件：`app/composables/useRecognitionHistory.ts`（remove）
- 修法：读合并写——先 `load()` 取出「本实例未见过的条目」（过滤掉与内存 id 重复的），与内存列表**并集**后再过滤掉待删 id，最后 persist。
- 说明：按 finding 要求用并集而非 `items.value = load()` 直接覆盖——storage 禁用时 `load()` 返回 `[]` 会清空内存会话态（并破坏测试 5 语义）。`clear()` 保持现状（清空语义下丢弃未见条目可接受）。
- 已用临时验证用例确认：页面实例持陈旧列表时单删，另一实例（useRecognize 内部）新增的条目不再被抹掉。

### I3（Important）— 永久禁用的 storage 被误判为配额超限，内存会话态被裁到 1 条
- 文件：`app/composables/useRecognitionHistory.ts`（persist）
- 修法：新增 composable 级 `persisted` 标志（是否成功落库过）：
  - 从未成功落库 + 写失败（Firefox 禁存储/Safari 隐私模式等异常被 defaultStorage 吞成 false）→ **不淘汰**，保留完整内存会话态；
  - 曾成功落库后再失败（真配额超限）→ 淘汰最旧重试；
  - write throw → catch，保留内存会话态（原语义不变）。
- **偏离说明**：finding 给出的片段为调用内局部 `let persisted` 且淘汰条件 `!persisted && length > 1`。逐条核对后发现该片段按字面实现有两处问题：(1) 局部标志在循环内恒为 false → 淘汰条件恒真 → I3 多条目场景实际未修复；(2) `while (length > 0)` 且无尾写 → `clear()` 的空列表不再落库 → 现有测试 6（`read()` 断言 `[]`）必挂。故按 finding 的语义描述（「首次写入就失败 → 不淘汰；曾成功过一次再失败 → 按配额淘汰重试」）与「不得破坏现有 6 例」约束，实现为 composable 级标志 + `if (!persisted) break` 守卫 + 保留单条/空列表尾写。行为与 finding 语义完全一致，现有测试全数通过。
- 已用临时验证用例确认：write 恒 false（禁用）→ 3 条内存完整保留、remove 仍可在内存生效；首写成功后失败（真配额）→ 仍走淘汰路径（对应测试 4）。

### I4（Important）— 移动端单删按钮不可见
- 文件：`app/components/HistoryDrawer.vue`
- 修法：删除按钮 class `opacity-0 group-hover:opacity-100` → `opacity-100 md:opacity-0 md:group-hover:opacity-100`。触屏（<md）常显，桌面端保留 hover 显示。

### M-A — makeThumb bitmap.close 不在 finally
- 文件：`app/utils/makeThumb.ts`
- 修法：bitmap 创建后以内层 `try { ...; return canvas.toDataURL(...) } finally { bitmap.close() }` 包裹绘制/导出；外层 catch 仍返回 null。toDataURL（或 getContext 等）抛出时不再泄漏 ImageBitmap；createImageBitmap 自身失败时无 bitmap 可关，直接走外层 catch。

## 保持不动（按终审清单）
- M1：history=1 留 URL。
- M2：makeThumb 时序取舍（刻意设计）。
- M3：stripWs 去重良性偏离。
- M4：淘汰下限保留 1 条良性。
- M5：抽屉打开期列表不实时刷新（I2 修复后数据无损，留 v2）。

## 回归
- `pnpm test`：Test Files 3 passed，Tests 13 passed（13/13）。特别核对：
  - 测试 4「QuotaExceeded：首写成功后失败 → 淘汰最旧重试」✓
  - 测试 5「storage 抛异常 → 保留内存会话态」✓
  - 测试 6「remove / clear（空列表落库 `[]`）」✓
- `pnpm lint`：0 errors（3 条既有 v-html warning，与本次无关）。
- `pnpm run generate`：成功，`.output/public` 可部署。

## 变更文件
- `app/pages/ocr.vue`（I1）
- `app/composables/useRecognitionHistory.ts`（I2、I3）
- `app/components/HistoryDrawer.vue`（I4）
- `app/utils/makeThumb.ts`（M-A）
