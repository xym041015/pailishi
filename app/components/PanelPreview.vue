<template>
  <section class="pk-panel flex flex-col">
    <header class="pk-panel-head">
      <div class="pk-fig-title">
        <span class="pk-fig-no">{{ t('fig_3') }}</span>
        <h2 class="pk-fig-name">
          {{ t('panel_preview') }}
        </h2>
      </div>
      <div class="flex items-center gap-1">
        <div class="mr-1 flex items-center gap-0.5 rounded-full border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-0.5">
          <button
            v-for="item in previewTabs"
            :key="item.value"
            type="button"
            class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
            :class="tab === item.value ? 'pk-highlighted' : 'text-[var(--pk-muted)] hover:text-[var(--pk-ink)]'"
            @click="tab = item.value as 'katex' | 'mathlive'"
          >
            {{ item.label }}
          </button>
        </div>
        <UTooltip
          :text="t('font_minus')"
          :delay-duration="0"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-zoom-out"
            class="pk-icon-btn"
            aria-label="font minus"
            @click="$emit('font-minus')"
          />
        </UTooltip>
        <UTooltip
          :text="t('font_plus')"
          :delay-duration="0"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-zoom-in"
            class="pk-icon-btn"
            aria-label="font plus"
            @click="$emit('font-plus')"
          />
        </UTooltip>
        <UTooltip
          :text="t('fullscreen')"
          :delay-duration="0"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-maximize"
            class="pk-icon-btn"
            aria-label="fullscreen"
            @click="goFullscreen"
          />
        </UTooltip>
      </div>
    </header>

    <div
      ref="previewRef"
      class="flex min-h-[200px] flex-1 items-center justify-center overflow-auto rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-6"
      :style="{ fontSize: `${fontSize}px` }"
    >
      <div
        v-show="tab === 'katex'"
        class="w-full"
      >
        <div
          v-if="code"
          ref="katexHost"
          class="pk-katex w-fit min-w-full overflow-x-auto py-4 text-center"
          v-html="rendered"
        />
        <div
          v-else
          class="flex flex-col items-center gap-3 py-10 text-center"
        >
          <span class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--pk-icon)]">
            <span class="pk-serif text-3xl font-bold text-[var(--pk-primary)]">∫</span>
          </span>
          <p class="pk-serif text-sm font-semibold text-[var(--pk-ink)]">
            {{ t('empty_preview') }}
          </p>
        </div>
        <div
          v-if="errorMessage"
          class="mt-2 text-xs text-[var(--pk-warn)]"
        >
          {{ errorMessage }}
        </div>
      </div>
      <div
        v-if="tab === 'mathlive'"
        class="w-full min-w-[320px]"
      >
        <VMathfield
          :model-value="code"
          :placeholder="t('preview_placeholder_mathlive')"
          @update:model-value="$emit('update:code', $event as string)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import katex from 'katex'

const props = defineProps<{
  code: string
  fontSize: number
  // 带 \htmlData{seg=N} 标记的渲染源码（源码选区↔预览高亮联动，见 utils/latexSegments.ts）
  wrappedCode?: string
  // 当前选区命中的 seg 编号列表
  highlightSegs?: number[]
}>()

const emit = defineEmits<{
  'update:code': [value: string]
  'font-plus': []
  'font-minus': []
}>()

void emit

const { t } = useI18n()

const tab = ref<'katex' | 'mathlive'>('katex')
const previewRef = ref<HTMLElement | null>(null)
const katexHost = ref<HTMLElement | null>(null)

// Mathlive 体积较大（~0.8MB）且默认标签页用不到：异步加载，
// 首次切到 Mathlive 标签页才下载，缩短工作台首屏加载时间
const VMathfield = defineAsyncComponent(() => import('./VMathfield.vue'))

const previewTabs = [
  { label: 'KaTeX', value: 'katex' },
  { label: 'Mathlive', value: 'mathlive' }
]

const rendered = computed(() => {
  const src = props.wrappedCode || props.code
  if (!src) return ''
  return katex.renderToString(src, {
    throwOnError: false,
    displayMode: true,
    // \htmlData 仅用于高亮联动打标记，不放开其他信任项
    trust: context => context.command === '\\htmlData',
    strict: 'ignore'
  })
})

// 源码选区变化时，给预览里对应 data-seg 片段加/去荧光笔高亮
watch(
  () => [props.highlightSegs, rendered.value],
  () => {
    const host = katexHost.value
    if (!host) return
    const hl = props.highlightSegs ?? []
    host.querySelectorAll<HTMLElement>('[data-seg]').forEach((el) => {
      el.classList.toggle('pk-seg-hl', hl.includes(Number(el.dataset.seg)))
    })
  },
  { flush: 'post', immediate: true }
)

const errorMessage = computed(() => {
  if (!props.code) return ''
  const container = document.createElement('div')
  container.innerHTML = rendered.value
  const errorSpan = container.querySelector('.katex-error')
  return errorSpan?.getAttribute('title') ?? ''
})

function goFullscreen() {
  previewRef.value?.requestFullscreen?.()
}
</script>
