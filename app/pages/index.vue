<script setup lang="ts">
// 产品首页：SimpleTex 式「介绍页 + 功能栏」结构（模块 7）。
// 只展示真实状态——未上线功能虚线占位标「开发中」，不做假按钮。
useSeoMeta({
  title: '拍立式 SnapLaTeX — 拍下来，粘进 Word 就能改',
  description: '免费公式识别工具：截图转 LaTeX，粘进 Word 就是可编辑原生公式。无需登录，识别在浏览器本地完成，图片不上传。'
})

const { t } = useI18n()

const readyFeats = computed(() => [
  { name: t('home_feat1_name'), desc: t('home_feat1_desc'), to: '/ocr' },
  { name: t('home_feat2_name'), desc: t('home_feat2_desc'), to: '/guide' }
])

const wipFeats = computed(() => [
  { name: t('home_feat3_name'), desc: t('home_feat3_desc') },
  { name: t('home_feat4_name'), desc: t('home_feat4_desc') },
  { name: t('home_feat5_name'), desc: t('home_feat5_desc') }
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
</script>

<template>
  <div class="pk-home relative z-10 mx-auto h-full w-full max-w-[1100px] overflow-y-auto px-4 pb-10">
    <!-- 1. 功能栏：课程表式横条，已上线实线可点，未上线虚线占位 -->
    <section class="mt-5">
      <div class="pk-schedule-wrap overflow-x-auto rounded-md border border-[var(--pk-line)] shadow-sm">
        <div class="pk-schedule flex min-w-[680px] bg-[var(--pk-panel)]">
          <div class="pk-schedule__label hidden w-9 shrink-0 items-center justify-center border-r border-[var(--pk-line)] bg-[var(--pk-board)] sm:flex">
            <span class="pk-serif text-xs tracking-[0.3em] text-white [writing-mode:vertical-rl]">{{ t('home_schedule') }}</span>
          </div>
          <NuxtLink
            v-for="(feat, i) in readyFeats"
            :key="feat.name"
            :to="feat.to"
            class="pk-schedule__cell pk-schedule__cell--ready flex-1"
          >
            <span class="flex items-center justify-between gap-1">
              <span class="pk-fig-no">{{ i + 1 }}</span>
              <span class="pk-schedule__status pk-schedule__status--ready">{{ t('home_status_ready') }}</span>
            </span>
            <span class="pk-serif mt-1.5 block text-sm font-bold text-[var(--pk-ink)]">{{ feat.name }}</span>
            <span class="mt-1 block text-xs leading-5 text-[var(--pk-muted)]">{{ feat.desc }}</span>
          </NuxtLink>
          <div
            v-for="(feat, i) in wipFeats"
            :key="feat.name"
            class="pk-schedule__cell pk-schedule__cell--wip flex-1"
            :title="t('home_status_wip')"
          >
            <span class="flex items-center justify-between gap-1">
              <span class="pk-fig-no">{{ readyFeats.length + i + 1 }}</span>
              <span class="pk-schedule__status pk-schedule__status--wip">{{ t('home_status_wip') }}</span>
            </span>
            <span class="pk-serif mt-1.5 block text-sm font-bold text-[var(--pk-ink)]">{{ feat.name }}</span>
            <span class="mt-1 block text-xs leading-5 text-[var(--pk-muted)]">{{ feat.desc }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Hero：slogan 大标题 + 差异点 + 双 CTA -->
    <section class="mx-auto mt-14 max-w-[760px] text-center">
      <h1 class="pk-serif text-3xl font-bold leading-snug tracking-wide text-[var(--pk-ink)] sm:text-4xl">
        {{ t('slogan') }}
      </h1>
      <p class="mt-4 text-sm leading-6 text-[var(--pk-muted)]">
        {{ t('home_hero_points') }}
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <NuxtLink
          to="/ocr"
          class="pk-btn pk-btn-solid"
        >
          {{ t('home_cta_workspace') }}
        </NuxtLink>
        <NuxtLink
          to="/guide"
          class="pk-btn pk-btn-outline"
        >
          {{ t('home_cta_guide') }}
        </NuxtLink>
      </div>
    </section>

    <!-- 3. 能拍什么：真实识别素材 -->
    <section class="mt-14">
      <span class="pk-fig-no">{{ t('home_capture_eyebrow') }}</span>
      <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div
          v-for="cap in captures"
          :key="cap.name"
          class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-3"
        >
          <img
            :src="cap.img"
            :alt="cap.name"
            class="h-24 w-full rounded bg-[var(--pk-edit-bg)] object-contain p-2"
            loading="lazy"
          >
          <p class="pk-serif mt-2 text-center text-sm font-semibold text-[var(--pk-ink)]">
            {{ cap.name }}
          </p>
        </div>
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-3">
          <div class="flex h-24 w-full items-center justify-center rounded bg-[var(--pk-edit-bg)]">
            <UIcon
              name="i-lucide-pencil-line"
              class="h-9 w-9 text-[var(--pk-icon)]"
            />
          </div>
          <p class="pk-serif mt-2 text-center text-sm font-semibold text-[var(--pk-ink)]">
            {{ t('home_capture4') }}
          </p>
          <p class="mt-0.5 text-center text-[10px] leading-4 text-[var(--pk-muted)]">
            {{ t('home_capture_note') }}
          </p>
        </div>
      </div>
    </section>

    <!-- 4. 三步上手 -->
    <section class="mt-14">
      <span class="pk-fig-no">{{ t('home_steps_eyebrow') }}</span>
      <div class="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-1">
        <template
          v-for="(step, i) in steps"
          :key="step.name"
        >
          <div class="flex-1 rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] p-4">
            <span class="pk-fig-no">{{ i + 1 }}</span>
            <p class="pk-serif mt-1.5 text-sm font-bold text-[var(--pk-ink)]">
              {{ step.name }}
            </p>
            <p class="mt-1 text-xs leading-5 text-[var(--pk-muted)]">
              {{ step.desc }}
            </p>
          </div>
          <span
            v-if="i < steps.length - 1"
            class="hidden px-1 text-center text-lg text-[var(--pk-muted)] sm:block"
          >
            →
          </span>
        </template>
      </div>
      <div class="mt-3 text-center">
        <NuxtLink
          to="/guide"
          class="text-xs text-[var(--pk-muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--pk-primary)]"
        >
          {{ t('home_steps_link') }}
        </NuxtLink>
      </div>
    </section>

    <!-- 5. 关于 -->
    <section class="mt-14">
      <span class="pk-fig-no">{{ t('home_about_eyebrow') }}</span>
      <p class="mt-3 max-w-[720px] text-sm leading-7 text-[var(--pk-ink)]">
        {{ t('home_about_body') }}
      </p>
    </section>

    <!-- 6. 页脚（备案号行：ICP 备案通过后在此渲染，链接 https://beian.miit.gov.cn/） -->
    <footer class="mt-14 border-t border-[var(--pk-line)] pt-5 text-center text-xs text-[var(--pk-muted)]">
      <p>{{ t('footer_brand') }}</p>
      <a
        href="https://github.com/xym041015/pailishi"
        target="_blank"
        rel="noopener"
        class="mt-1 inline-flex items-center gap-1 hover:text-[var(--pk-primary)]"
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
/* 课程表功能栏：格子间共用边线，已上线格 hover 抬起；未上线格铺斜纹（像试卷装订线阴影） */
.pk-schedule__cell {
  border-left: 1px solid var(--pk-line);
  display: block;
  padding: 12px 14px;
}

.pk-schedule__cell:first-child,
.pk-schedule__label + .pk-schedule__cell {
  border-left: 0;
}

.pk-schedule__cell--ready {
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.pk-schedule__cell--ready:hover {
  background: var(--pk-primary-soft);
  box-shadow: inset 0 -2px 0 var(--pk-primary);
  transform: translateY(-2px);
}

.pk-schedule__cell--wip {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent 0,
      transparent 6px,
      var(--pk-primary-soft) 6px,
      var(--pk-primary-soft) 7px
    );
  cursor: default;
}

.pk-schedule__status {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
}

.pk-schedule__status--ready {
  color: var(--pk-primary);
}

.pk-schedule__status--wip {
  color: var(--pk-muted);
}

/* 页面滚动容器 */
.pk-home::-webkit-scrollbar {
  width: 8px;
}

.pk-home::-webkit-scrollbar-thumb {
  background: var(--pk-line);
  border-radius: 4px;
}
</style>
