<script setup lang="ts">
import { FEEDBACK_URL } from '../utils/siteConfig'

const { t } = useI18n()

// 实录视频：静音自动循环；偏好减少动效时停在海报帧
const guideVideo = ref<HTMLVideoElement | null>(null)
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    guideVideo.value?.removeAttribute('autoplay')
    guideVideo.value?.pause()
  }
})

useSeoMeta({
  title: '使用教程 — 拍立式 SnapLaTeX',
  description: '三步学会拍立式：截图公式 → 粘贴进网页 → 复制为 Word 可编辑原生公式。全程浏览器本地完成，图片不上传。'
})
</script>

<template>
  <div class="pk-guide relative z-10 mx-auto h-full w-full max-w-[1100px] overflow-y-auto px-4 pb-16 pt-10">
    <!-- 页首：宋体大标题 -->
    <header class="mx-auto max-w-[760px] text-center">
      <h1 class="pk-serif text-3xl font-bold tracking-wide text-[var(--pk-ink)]">
        三步，把截图里的公式搬进 Word
      </h1>
      <p class="mt-3 text-sm leading-6 text-[var(--pk-muted)]">
        全程在你的浏览器里完成，图片不上传。第一次打开会下载约
        <span class="pk-marker">80MB 识别模型</span>，只需一次，之后秒开。
      </p>
    </header>

    <!-- 签名元素：40 秒真实操作实录（静音自动循环，可开声音） -->
    <figure class="pk-video mx-auto mt-10 max-w-[860px]">
      <div class="overflow-hidden rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] shadow-sm">
        <video
          ref="guideVideo"
          class="block w-full"
          src="/assets/tutorial-demo.mp4"
          poster="/assets/tutorial-demo-poster.jpg"
          autoplay
          muted
          loop
          controls
          playsinline
          preload="metadata"
        />
      </div>
      <figcaption class="mt-2 text-center text-xs text-[var(--pk-muted)]">
        图 · 40 秒实录：一张截图的旅程（静音自动播放，点播放器右下角可开声音）
      </figcaption>
    </figure>

    <!-- 三步详解 -->
    <section class="mx-auto mt-12 max-w-[860px] space-y-4">
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
          —— 得到的就是<span class="pk-marker">可编辑的原生公式</span>，不是图片。PPT 里同样直接粘贴即可。
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
        <summary>能在 WPS 或 PPT 里用吗？</summary>
        <p>WPS 文字对原生公式的兼容性不如 Word，推荐 Word 2016+ 或 Microsoft 365；PowerPoint 里同样可以直接粘贴。</p>
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

    <!-- CTA：整页的重点，用荧光笔黄大胶囊"划"出来 -->
    <div class="mx-auto mt-12 flex max-w-[860px] flex-col items-center gap-3 pb-6 text-center">
      <NuxtLink
        to="/ocr"
        class="group inline-flex items-center gap-3 rounded-full bg-[var(--pk-highlight)] px-10 py-4 shadow-[0_5px_0_rgba(43,92,143,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_9px_0_rgba(43,92,143,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(43,92,143,0.35)]"
      >
        <span class="pk-serif text-lg font-bold text-[#1f3d5c] sm:text-xl">回到工作台，点「示例图片」试一张</span>
        <UIcon
          name="i-lucide-arrow-right"
          class="h-6 w-6 shrink-0 text-[#1f3d5c] transition-transform group-hover:translate-x-1.5"
        />
      </NuxtLink>
      <p class="text-sm text-[var(--pk-muted)]">
        右上角的「教程」随时可以回来复习
      </p>
    </div>

    <!-- 页脚：提意见入口（FEEDBACK_URL 为空则隐藏，见 utils/siteConfig.ts） -->
    <footer class="mx-auto mt-10 max-w-[860px] border-t border-[var(--pk-line)] pt-5 pb-2 text-center text-xs text-[var(--pk-muted)]">
      <a
        v-if="FEEDBACK_URL"
        :href="FEEDBACK_URL"
        target="_blank"
        rel="noopener"
        class="hover:text-[var(--pk-primary)]"
      >{{ t('feedback_action') }}</a>
    </footer>
  </div>
</template>

<style scoped>
/* 实录视频框：轻描边，配色随备课纸 */
.pk-video video {
  aspect-ratio: 16 / 9;
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

/* 动效尊重系统偏好（由脚本暂停自动播放） */
</style>
