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
        v-show="tab === 'mathlive'"
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

const previewTabs = [
  { label: 'KaTeX', value: 'katex' },
  { label: 'Mathlive', value: 'mathlive' }
]

const rendered = computed(() => {
  if (!props.code) return ''
  return katex.renderToString(props.code, {
    throwOnError: false,
    displayMode: true
  })
})

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
