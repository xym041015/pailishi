<script setup lang="ts">
useSeoMeta({
  title: '使用教程 — 拍立式 SnapLaTeX',
  description: '三步学会拍立式：截图公式 → 粘贴进网页 → 复制为 Word 可编辑原生公式。全程浏览器本地完成，图片不上传。'
})
</script>

<template>
  <div class="pk-guide relative z-10 mx-auto h-full w-full max-w-[1100px] overflow-y-auto px-4 pb-16 pt-6">
    <!-- 页首： eyebrow + 宋体大标题 -->
    <header class="mx-auto max-w-[760px] text-center">
      <span class="pk-fig-no">使用教程</span>
      <h1 class="pk-serif mt-3 text-3xl font-bold tracking-wide text-[var(--pk-ink)]">
        三步，把截图里的公式搬进 Word
      </h1>
      <p class="mt-3 text-sm leading-6 text-[var(--pk-muted)]">
        全程在你的浏览器里完成，图片不上传。第一次打开会下载约
        <span class="pk-marker">80MB 识别模型</span>，只需一次，之后秒开。
      </p>
    </header>

    <!-- 签名元素：三格板书演示条（循环动画） -->
    <div
      class="pk-demo mx-auto mt-8 flex max-w-[860px] items-stretch justify-center gap-2 sm:gap-3"
      aria-hidden="true"
    >
      <!-- 第 1 格：取景框截图 -->
      <div class="pk-demo__frame pk-demo__frame--snap">
        <div class="pk-demo__screen">
          <span class="pk-demo__corner pk-demo__corner--tl" />
          <span class="pk-demo__corner pk-demo__corner--tr" />
          <span class="pk-demo__corner pk-demo__corner--bl" />
          <span class="pk-demo__corner pk-demo__corner--br" />
          <span class="pk-demo__formula">2<sup>2</sup>·90°·f|<sub>x=1</sub></span>
          <span class="pk-demo__flash" />
        </div>
        <p class="pk-demo__cap">
          <span class="pk-fig-no">第 1 步</span> 截图
        </p>
      </div>
      <span class="pk-demo__arrow">→</span>
      <!-- 第 2 格：网页 LaTeX 面板 -->
      <div class="pk-demo__frame pk-demo__frame--web">
        <div class="pk-demo__page">
          <div class="pk-demo__bar">
            <span class="pk-demo__bar-dot" />
            <span>LaTeX 源码</span>
          </div>
          <p class="pk-demo__code">
            2^{2^{lim_{n→∞}(\frac{1}{2})^n}90°f|_{x=1}}
          </p>
          <span class="pk-demo__chip">复制成 Word 公式</span>
        </div>
        <p class="pk-demo__cap">
          <span class="pk-fig-no">第 2 步</span> 粘贴
        </p>
      </div>
      <span class="pk-demo__arrow">→</span>
      <!-- 第 3 格：Word 文档 -->
      <div class="pk-demo__frame pk-demo__frame--word">
        <div class="pk-demo__doc">
          <p class="pk-demo__doc-line" />
          <p class="pk-demo__doc-formula">
            2<sup>2<sup>lim</sup>ₙ₌₁</sup>·90°·f|<sub>x=1</sub>
          </p>
          <p class="pk-demo__doc-line" />
          <span class="pk-demo__sel" />
        </div>
        <p class="pk-demo__cap">
          <span class="pk-fig-no">第 3 步</span> 粘进 Word
        </p>
      </div>
    </div>
    <p class="mx-auto mt-2 max-w-[860px] text-center text-xs text-[var(--pk-muted)]">
      演示会自动循环播放 · 从左到右就是完整的使用顺序
    </p>

    <!-- 三步详解 -->
    <section class="mx-auto mt-10 max-w-[860px] space-y-4">
      <article class="pk-sec rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-5">
        <div class="flex items-baseline gap-3">
          <span class="pk-fig-no">第 1 步</span>
          <h2 class="pk-serif text-lg font-bold text-[var(--pk-ink)]">
            截下公式
          </h2>
        </div>
        <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pk-ink)]">
          <span>Windows</span>
          <kbd class="pk-kbd">Win</kbd><kbd class="pk-kbd">⇧</kbd><kbd class="pk-kbd">S</kbd>
          <span class="text-[var(--pk-muted)]">/</span>
          <span>macOS</span>
          <kbd class="pk-kbd">⌘</kbd><kbd class="pk-kbd">⌃</kbd><kbd class="pk-kbd">⇧</kbd><kbd class="pk-kbd">4</kbd>
        </p>
        <p class="mt-2 text-sm leading-6 text-[var(--pk-muted)]">
          按下快捷键后拖动鼠标，框选要识别的公式。
          <span class="pk-marker">框大一点、公式拍完整，识别更准</span>。
        </p>
      </article>

      <article class="pk-sec rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-5">
        <div class="flex items-baseline gap-3">
          <span class="pk-fig-no">第 2 步</span>
          <h2 class="pk-serif text-lg font-bold text-[var(--pk-ink)]">
            粘进网页
          </h2>
        </div>
        <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pk-ink)]">
          <span>回到拍立式，按</span>
          <kbd class="pk-kbd">Ctrl</kbd><kbd class="pk-kbd">V</kbd>
          <span class="text-[var(--pk-muted)]">/</span>
          <kbd class="pk-kbd">⌘V</kbd>
        </p>
        <p class="mt-2 text-sm leading-6 text-[var(--pk-muted)]">
          也可以直接把图片文件拖进网页，或点「点击上传」。截图到手后
          <span class="pk-marker">不要存文件、不要经过微信传输</span>，直接粘贴效果最好。
        </p>
      </article>

      <article class="pk-sec rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-5">
        <div class="flex items-baseline gap-3">
          <span class="pk-fig-no">第 3 步</span>
          <h2 class="pk-serif text-lg font-bold text-[var(--pk-ink)]">
            复制进 Word
          </h2>
        </div>
        <p class="mt-3 text-sm text-[var(--pk-ink)]">
          点源码面板下方的「复制成 Word 公式」，打开 Word 按
          <kbd class="pk-kbd">Ctrl</kbd><kbd class="pk-kbd">V</kbd>
          —— 得到的就是<span class="pk-marker">可编辑的原生公式</span>，不是图片。
        </p>
        <p class="mt-2 flex items-center gap-1.5 text-sm text-[var(--pk-warn)]">
          <UIcon
            name="i-lucide-triangle-alert"
            class="h-3.5 w-3.5 shrink-0"
          />
          <span>如果粘出来是一串代码，说明复制成了 LaTeX 源码——回到网页换「复制成 Word 公式」再粘一次。</span>
        </p>
      </article>
    </section>

    <!-- 常见问题 -->
    <section class="pk-faq mx-auto mt-10 max-w-[860px] rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-5">
      <h2 class="pk-serif text-lg font-bold text-[var(--pk-ink)]">
        常见问题
      </h2>
      <details>
        <summary>第一次打开，识别一直转圈？</summary>
        <p>正在下载约 80MB 的识别模型，下载一次后保存在浏览器里，之后打开就是秒识别。请等顶部进度提示走完，下载期间先别点识别。</p>
      </details>
      <details>
        <summary>提示「图片小于 384×384」？</summary>
        <p>截图时把范围框大一点，或先把原网页、文档放大后再截。公式在图里越大越清晰，识别越准。</p>
      </details>
      <details>
        <summary>粘进 Word 后变成一串代码？</summary>
        <p>说明复制到的是 LaTeX 源码。回到网页，点「复制成 Word 公式」重新复制再粘贴。需要 Word 2016 或更高版本。</p>
      </details>
      <details>
        <summary>识别结果不对？</summary>
        <p>先把截图拍清楚、拍完整。如果对手写体或模糊印刷要求更高，点页头的齿轮，配置云端识别通道（见下方进阶玩法）。</p>
      </details>
      <details>
        <summary>我的公式截图会被上传吗？</summary>
        <p>不会。识别完全在你的浏览器里完成，图片不离开这台设备；只有你主动配置了云端识别通道时，图片才会发往对应服务商。</p>
      </details>
      <details>
        <summary>能在 WPS 里用吗？</summary>
        <p>WPS 文字对原生公式的兼容性不如 Word，推荐 Word 2016+ 或 Microsoft 365。</p>
      </details>
    </section>

    <!-- 进阶：云端识别 -->
    <section class="mx-auto mt-6 max-w-[860px] rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-5">
      <div class="flex items-baseline gap-3">
        <span class="pk-fig-no">进阶</span>
        <h2 class="pk-serif text-lg font-bold text-[var(--pk-ink)]">
          云端高精度识别
        </h2>
      </div>
      <p class="mt-3 text-sm leading-6 text-[var(--pk-muted)]">
        本地模型小而快，大多数印刷体公式够用。遇到手写体、拍照模糊的公式想要更高精度时，
        可以配置云端识别通道：点页头的齿轮打开设置 → 选择
        <span class="pk-marker">SimpleTex</span>
        （有免费额度）→ 到 simpletex.cn 注册并在个人中心创建 API Token → 粘贴保存。配置后识别会走云端，精度更高。
      </p>
    </section>

    <!-- CTA -->
    <div class="mx-auto mt-8 flex max-w-[860px] flex-col items-center gap-2 pb-4 text-center">
      <NuxtLink
        to="/ocr"
        class="pk-btn pk-btn-solid"
      >
        回到工作台，点「示例图片」试一张
      </NuxtLink>
      <p class="text-xs text-[var(--pk-muted)]">
        右上角的「教程」随时可以回来复习
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 演示条：三格循环高亮，从取景框 → 网页 → Word，一轮 9 秒 */
.pk-demo__frame {
  animation: pk-demo-cycle 9s infinite;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  opacity: 0.38;
}

.pk-demo__frame--snap {
  animation-delay: 0s;
}

.pk-demo__frame--web {
  animation-delay: 3s;
}

.pk-demo__frame--word {
  animation-delay: 6s;
}

@keyframes pk-demo-cycle {
  0% {
    opacity: 0.38;
    transform: none;
  }

  6% {
    opacity: 1;
    transform: translateY(-3px);
  }

  28% {
    opacity: 1;
    transform: translateY(-3px);
  }

  33% {
    opacity: 0.38;
    transform: none;
  }

  100% {
    opacity: 0.38;
  }
}

.pk-demo__arrow {
  align-self: center;
  color: var(--pk-muted);
  flex-shrink: 0;
  font-size: 18px;
}

.pk-demo__screen,
.pk-demo__page,
.pk-demo__doc {
  background: var(--pk-panel);
  border: 1px solid var(--pk-line);
  border-radius: 6px;
  flex: 1;
  padding: 12px;
  position: relative;
}

.pk-demo__screen {
  min-height: 108px;
}

.pk-demo__corner {
  border: 2px solid var(--pk-primary);
  height: 14px;
  position: absolute;
  width: 14px;
}

.pk-demo__corner--tl {
  border-right: 0;
  border-top: 0;
  left: 8px;
  top: 8px;
}

.pk-demo__corner--tr {
  border-right: 0;
  border-top: 0;
  right: 8px;
  top: 8px;
  transform: rotate(90deg);
}

.pk-demo__corner--bl {
  border-bottom: 0;
  border-left: 0;
  bottom: 8px;
  left: 8px;
  transform: rotate(-90deg);
}

.pk-demo__corner--br {
  border-bottom: 0;
  border-left: 0;
  bottom: 8px;
  right: 8px;
  transform: rotate(180deg);
}

.pk-demo__formula {
  color: var(--pk-ink);
  font-family: 'STIX Two Math', 'Cambria Math', Georgia, serif;
  font-style: italic;
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}

/* 快门闪烁：在第 1 格被"高亮"的瞬间闪一下 */
.pk-demo__flash {
  animation: pk-demo-flash 9s infinite;
  background: rgba(255, 255, 255, 0.85);
  inset: 0;
  opacity: 0;
  position: absolute;
}

@keyframes pk-demo-flash {
  0% {
    opacity: 0.8;
  }

  14% {
    opacity: 0;
  }

  100% {
    opacity: 0;
  }
}

.pk-demo__bar {
  align-items: center;
  background: var(--pk-board);
  border-radius: 4px;
  color: #fff;
  display: flex;
  font-size: 10px;
  gap: 6px;
  padding: 3px 8px;
}

.pk-demo__bar-dot {
  background: var(--pk-highlight, #f6e27a);
  border-radius: 50%;
  height: 6px;
  width: 6px;
}

.pk-demo__code {
  color: var(--pk-ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pk-demo__chip {
  background: var(--pk-primary);
  border-radius: 4px;
  bottom: 8px;
  color: #fff;
  display: inline-block;
  font-size: 10px;
  left: 12px;
  padding: 2px 8px;
  position: absolute;
}

.pk-demo__doc {
  padding: 12px 16px;
}

.pk-demo__doc-line {
  background: var(--pk-line);
  border-radius: 2px;
  height: 6px;
  margin-top: 10px;
}

.pk-demo__doc-formula {
  color: var(--pk-ink);
  font-family: 'STIX Two Math', 'Cambria Math', Georgia, serif;
  margin: 6px 0;
  text-align: center;
}

.pk-demo__sel {
  animation: pk-demo-sel 9s infinite;
  animation-delay: 6s;
  border: 1.5px dashed rgba(43, 92, 143, 0.75);
  border-radius: 4px;
  inset: 18% 10%;
  opacity: 0;
  position: absolute;
}

@keyframes pk-demo-sel {
  0% {
    opacity: 0;
  }

  6% {
    opacity: 1;
  }

  28% {
    opacity: 1;
  }

  33% {
    opacity: 0;
  }

  100% {
    opacity: 0;
  }
}

.pk-demo__cap {
  align-items: center;
  color: var(--pk-muted);
  display: flex;
  font-size: 12px;
  gap: 8px;
}

@media (max-width: 640px) {
  .pk-demo {
    flex-direction: column;
  }

  .pk-demo__arrow {
    transform: rotate(90deg);
  }
}

/* 荧光笔划重点 */
.pk-marker {
  background: linear-gradient(
    transparent 52%,
    rgba(246, 226, 122, 0.6) 52%,
    rgba(246, 226, 122, 0.6) 94%,
    transparent 94%
  );
  box-decoration-break: clone;
  color: var(--pk-ink);
  padding: 0 2px;
}

/* 页面滚动容器 */
.pk-guide::-webkit-scrollbar {
  width: 8px;
}

.pk-guide::-webkit-scrollbar-thumb {
  background: var(--pk-line);
  border-radius: 4px;
}

/* FAQ 折叠 */
.pk-faq details {
  border-bottom: 1px solid var(--pk-line);
}

.pk-faq details:last-child {
  border-bottom: 0;
}

.pk-faq summary {
  cursor: pointer;
  font-weight: 600;
  list-style: none;
  padding: 10px 0;
  position: relative;
}

.pk-faq summary::-webkit-details-marker {
  display: none;
}

.pk-faq summary::after {
  color: var(--pk-muted);
  content: '+';
  font-size: 16px;
  line-height: 1;
  position: absolute;
  right: 2px;
  top: 10px;
}

.pk-faq details[open] summary::after {
  content: '−';
}

.pk-faq details p {
  color: var(--pk-muted);
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 12px;
}

/* 动效尊重系统偏好 */
@media (prefers-reduced-motion: reduce) {
  .pk-demo__frame,
  .pk-demo__flash,
  .pk-demo__sel {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .pk-demo__flash {
    opacity: 0;
  }
}
</style>
