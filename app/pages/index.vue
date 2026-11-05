<script setup lang="ts">
import type { Directive } from 'vue'
import katex from 'katex'

// 产品首页 v3：在 v2 门面基础上加入克制的动效——
// Hero 一次性入场渐显、悬浮符号氛围、仿样窗微浮动、滚动进入视口时揭示（尊重 prefers-reduced-motion）。
useSeoMeta({
  title: '拍立式 SnapLaTeX — 拍下来，粘进 Word 就能改',
  description: '免费公式识别工具：截图转 LaTeX，粘进 Word 就是可编辑原生公式。无需登录，识别在浏览器本地完成，图片不上传。'
})

const { t } = useI18n()

const DEMO_LATEX = '2^{2^{\\operatorname*{lim}_{n\\rightarrow\\infty}\\left({\\frac{1}{2}}\\right)^{n}}90^{\\circ}f|_{x=1}}'

const demoRendered = computed(() =>
  katex.renderToString(DEMO_LATEX, { throwOnError: false, displayMode: true })
)

const feats = computed(() => [
  { icon: 'i-lucide-camera', name: t('home_feat1_name'), desc: t('home_feat1_desc'), to: '/ocr', wip: false },
  { icon: 'i-lucide-graduation-cap', name: t('home_feat2_name'), desc: t('home_feat2_desc'), to: '/guide', wip: false },
  { icon: 'i-lucide-pencil-line', name: t('home_feat3_name'), desc: t('home_feat3_desc'), wip: true },
  { icon: 'i-lucide-history', name: t('home_feat4_name'), desc: t('home_feat4_desc'), wip: true },
  { icon: 'i-lucide-image-down', name: t('home_feat5_name'), desc: t('home_feat5_desc'), wip: true }
])

const captures = computed(() => [
  { img: '/assets/test_img/单行公式.png', name: t('home_capture1') },
  { img: '/assets/test_img/多行公式.png', name: t('home_capture2') },
  { img: '/assets/test_img/单行公式2.png', name: t('home_capture3') }
])

const steps = computed(() => [
  { name: t('home_step1_name'), desc: t('home_step1_desc') },
  { name: t('home_step2_name'), desc: t('home_step2_desc') },
  { name: t('home_step3_name'), desc: t('home_step3_desc') }
])

// 滚动揭示：进入视口时给元素加 pk-reveal-in；挂载时已在视口内的不隐藏（避免闪一下）
const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const inView = el.getBoundingClientRect().top < window.innerHeight
    if (inView) return
    el.classList.add('pk-reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.classList.add('pk-reveal-in')
          io.disconnect()
        }
      }
    }, { threshold: 0.12 })
    io.observe(el)
  }
}
</script>

<template>
  <div class="pk-home h-full overflow-y-auto">
    <!-- 1. Hero：墨蓝渐变整幅 + 悬浮数学符号 + 左文案右产品仿样 -->
    <section class="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2b5c8f] to-[#3a6ea5]">
      <!-- 氛围：漂浮的数学符号 -->
      <span
        class="pk-hero-float pk-serif pointer-events-none absolute left-[5%] top-[14%] select-none text-8xl italic text-white/10"
        aria-hidden="true"
      >π</span>
      <span
        class="pk-hero-float pk-serif pointer-events-none absolute bottom-[10%] left-[38%] select-none text-7xl italic text-white/8 [animation-delay:-6s]"
        aria-hidden="true"
      >∫</span>
      <span
        class="pk-serif pointer-events-none absolute -right-8 top-2 select-none text-[280px] italic leading-none text-white/5"
        aria-hidden="true"
      >Σ</span>

      <div class="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div class="text-center lg:text-left">
          <p
            class="pk-hero-anim pk-serif text-5xl font-bold tracking-wide text-white drop-shadow-md sm:text-6xl"
            style="animation-delay: 0.05s"
          >
            {{ t('appName') }}
          </p>
          <p
            class="pk-hero-anim pk-serif mt-4 text-xl font-semibold text-white/90 sm:text-2xl"
            style="animation-delay: 0.18s"
          >
            {{ t('slogan') }}
          </p>
          <p
            class="pk-hero-anim mx-auto mt-5 max-w-[460px] text-sm leading-7 text-white/70 lg:mx-0"
            style="animation-delay: 0.32s"
          >
            {{ t('home_hero_desc') }}
          </p>
          <div
            class="pk-hero-anim mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            style="animation-delay: 0.46s"
          >
            <NuxtLink
              to="/ocr"
              class="rounded-full bg-white px-8 py-3 text-base font-semibold text-[#1f3d5c] shadow-lg transition-transform hover:scale-[1.03]"
            >
              {{ t('home_cta_try') }}
            </NuxtLink>
            <NuxtLink
              to="/guide"
              class="rounded-full border border-white/40 bg-white/10 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-white/20"
            >
              {{ t('home_cta_guide') }}
            </NuxtLink>
          </div>
        </div>

        <!-- 工作台仿样：三迷你栏，真 KaTeX 渲染，整窗微浮动 -->
        <div
          class="pk-hero-mock mx-auto w-full max-w-[540px]"
          style="animation-delay: 0.3s"
        >
          <div class="pk-hero-anim overflow-hidden rounded-xl bg-[var(--pk-panel)] shadow-2xl ring-1 ring-white/20">
            <div class="flex h-8 items-center gap-1.5 border-b border-[var(--pk-line)] bg-[#eef1f5] px-3">
              <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span class="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span class="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span class="ml-2 flex-1 truncate rounded bg-white px-2 py-0.5 text-center text-[9px] text-[var(--pk-muted)]">
                snaplatex.cn/ocr
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2 p-3">
              <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-2">
                <span class="pk-fig-no">1</span>
                <div class="relative mt-1.5 flex h-24 items-center justify-center overflow-hidden rounded bg-white p-1">
                  <ViewfinderCorners :active="false" />
                  <img
                    src="/assets/test_img/单行公式.png"
                    alt=""
                    class="max-h-full max-w-full object-contain"
                  >
                </div>
              </div>
              <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-2">
                <span class="pk-fig-no">2</span>
                <p class="mt-1.5 h-24 overflow-hidden break-all rounded bg-white p-1.5 font-mono text-[7px] leading-[11px] text-[var(--pk-ink)]">
                  {{ DEMO_LATEX }}
                </p>
              </div>
              <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-2">
                <span class="pk-fig-no">3</span>
                <div
                  class="pk-katex mt-1.5 flex h-24 items-center justify-center overflow-hidden rounded bg-white"
                  :style="{ fontSize: '9px' }"
                  v-html="demoRendered"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. 功能栏：五张圆角功能卡，滚动揭示 + 逐张错峰 -->
    <section class="bg-[var(--pk-panel)] py-16">
      <div class="mx-auto max-w-6xl px-6">
        <div
          v-reveal
          class="text-center"
        >
          <h2 class="pk-serif text-2xl font-bold text-[var(--pk-ink)]">
            {{ t('home_schedule') }}
          </h2>
        </div>
        <div class="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <template
            v-for="(feat, i) in feats"
            :key="feat.name"
          >
            <div v-reveal="i * 90">
              <NuxtLink
                v-if="!feat.wip"
                :to="feat.to!"
                class="group block h-full rounded-2xl border border-[var(--pk-line)] bg-[var(--pk-page)] p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--pk-primary)] hover:shadow-md"
              >
                <div class="flex items-start justify-between">
                  <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--pk-primary-soft)] transition-transform group-hover:scale-110">
                    <UIcon
                      :name="feat.icon"
                      class="h-5 w-5 text-[var(--pk-primary)]"
                    />
                  </span>
                  <span class="rounded-full bg-[var(--pk-primary)] px-2 py-0.5 text-[10px] text-white">
                    {{ t('home_status_ready') }}
                  </span>
                </div>
                <p class="pk-serif mt-3 text-base font-bold text-[var(--pk-ink)]">
                  {{ feat.name }}
                </p>
                <p class="mt-1 text-xs leading-5 text-[var(--pk-muted)]">
                  {{ feat.desc }}
                </p>
              </NuxtLink>
              <div
                v-else
                class="h-full rounded-2xl border border-dashed border-[var(--pk-line)] p-5 opacity-80"
                :title="t('home_status_wip')"
              >
                <div class="flex items-start justify-between">
                  <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--pk-edit-bg)]">
                    <UIcon
                      :name="feat.icon"
                      class="h-5 w-5 text-[var(--pk-icon)]"
                    />
                  </span>
                  <span class="rounded-full bg-[var(--pk-edit-bg)] px-2 py-0.5 text-[10px] text-[var(--pk-muted)]">
                    {{ t('home_status_wip') }}
                  </span>
                </div>
                <p class="pk-serif mt-3 text-base font-bold text-[var(--pk-ink)]">
                  {{ feat.name }}
                </p>
                <p class="mt-1 text-xs leading-5 text-[var(--pk-muted)]">
                  {{ feat.desc }}
                </p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- 3. 能拍什么 -->
    <section class="bg-[var(--pk-page)] py-16">
      <div class="mx-auto max-w-6xl px-6">
        <div
          v-reveal
          class="text-center"
        >
          <h2 class="pk-serif text-2xl font-bold text-[var(--pk-ink)]">
            {{ t('home_capture_eyebrow') }}
          </h2>
        </div>
        <div class="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div
            v-for="(cap, i) in captures"
            :key="cap.name"
            v-reveal="i * 90"
          >
            <div class="h-full rounded-xl border border-[var(--pk-line)] bg-[var(--pk-panel)] p-3 shadow-sm transition-transform hover:-translate-y-1">
              <img
                :src="cap.img"
                :alt="cap.name"
                class="h-32 w-full rounded-lg bg-white object-contain p-2"
                loading="lazy"
              >
              <p class="pk-serif mt-2.5 text-center text-sm font-semibold text-[var(--pk-ink)]">
                {{ cap.name }}
              </p>
            </div>
          </div>
          <div v-reveal="captures.length * 90">
            <div class="h-full rounded-xl border border-dashed border-[var(--pk-line)] p-3">
              <div class="flex h-32 w-full items-center justify-center rounded-lg bg-[var(--pk-edit-bg)]">
                <UIcon
                  name="i-lucide-pencil-line"
                  class="h-10 w-10 text-[var(--pk-icon)]"
                />
              </div>
              <p class="pk-serif mt-2.5 text-center text-sm font-semibold text-[var(--pk-ink)]">
                {{ t('home_capture4') }}
              </p>
              <p class="mt-0.5 text-center text-[10px] leading-4 text-[var(--pk-muted)]">
                {{ t('home_capture_note') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. 三步上手：揭示时虚线从左往右绘入 -->
    <section class="bg-[var(--pk-panel)] py-16">
      <div class="mx-auto max-w-5xl px-6">
        <div
          v-reveal
          class="text-center"
        >
          <h2 class="pk-serif text-2xl font-bold text-[var(--pk-ink)]">
            {{ t('home_steps_eyebrow') }}
          </h2>
        </div>
        <div
          v-reveal="150"
          class="relative mt-10"
        >
          <div
            class="pk-steps-line absolute left-[17%] right-[17%] top-5 hidden border-t-2 border-dashed border-[var(--pk-line)] md:block"
            aria-hidden="true"
          />
          <div class="grid gap-8 md:grid-cols-3">
            <div
              v-for="(step, i) in steps"
              :key="step.name"
              class="relative text-center"
            >
              <span class="relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pk-primary)] text-base font-bold text-white shadow-md">
                {{ i + 1 }}
              </span>
              <p class="pk-serif mt-3 text-base font-bold text-[var(--pk-ink)]">
                {{ step.name }}
              </p>
              <p class="mt-1 text-xs leading-5 text-[var(--pk-muted)]">
                {{ step.desc }}
              </p>
            </div>
          </div>
        </div>
        <div
          v-reveal
          class="mt-8 text-center"
        >
          <NuxtLink
            to="/guide"
            class="text-sm text-[var(--pk-muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--pk-primary)]"
          >
            {{ t('home_steps_link') }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 5. 关于 -->
    <section class="bg-[var(--pk-page)] py-14">
      <div
        v-reveal
        class="mx-auto max-w-2xl px-6 text-center"
      >
        <h2 class="pk-serif text-2xl font-bold text-[var(--pk-ink)]">
          {{ t('home_about_eyebrow') }}
        </h2>
        <p class="mt-4 text-sm leading-7 text-[var(--pk-ink)]">
          {{ t('home_about_body') }}
        </p>
      </div>
    </section>

    <!-- 6. 页脚（备案号行：ICP 备案通过后在此渲染，链接 https://beian.miit.gov.cn/） -->
    <footer class="bg-[#1f3d5c] py-6 text-center text-xs text-white/60">
      <p>{{ t('footer_brand') }}</p>
      <a
        href="https://github.com/xym041015/pailishi"
        target="_blank"
        rel="noopener"
        class="mt-1 inline-flex items-center gap-1 text-white/70 hover:text-white"
      >
        <UIcon
          name="i-simple-icons-github"
          class="h-3.5 w-3.5"
        />
        GitHub
      </a>
    </footer>
  </div>
</template>

<style scoped>
/* 首页用干净的实底（工作台才有方格纸纹理），滚动容器随 app 壳 */
.pk-home {
  background: var(--pk-page);
}

/* Hero 入场：一次性渐显上移 */
@keyframes pk-hero-up {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.pk-hero-anim {
  animation: pk-hero-up 0.8s ease both;
}

/* 仿样窗微浮动 */
@keyframes pk-float {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-8px);
  }
}

.pk-hero-mock {
  animation: pk-hero-up 0.8s ease both, pk-float 6s ease-in-out 1.2s infinite alternate;
}

/* 漂浮数学符号 */
@keyframes pk-drift {
  from {
    transform: translateY(0) rotate(-2deg);
  }

  to {
    transform: translateY(-18px) rotate(3deg);
  }
}

.pk-hero-float {
  animation: pk-drift 14s ease-in-out infinite alternate;
}

/* 滚动揭示 */
.pk-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.pk-reveal-in {
  opacity: 1;
  transform: none;
}

/* 步骤虚线绘入 */
.pk-steps-line {
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 1.2s ease 0.25s;
}

.pk-reveal-in .pk-steps-line {
  transform: scaleX(1);
}

@media (prefers-reduced-motion: reduce) {
  .pk-hero-anim,
  .pk-hero-mock,
  .pk-hero-float {
    animation: none;
    opacity: 1;
  }

  .pk-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .pk-steps-line {
    transform: scaleX(1);
    transition: none;
  }
}

.pk-home::-webkit-scrollbar {
  width: 8px;
}

.pk-home::-webkit-scrollbar-thumb {
  background: var(--pk-line);
  border-radius: 4px;
}
</style>
