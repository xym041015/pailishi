<template>
  <section class="pk-panel flex flex-col">
    <header class="pk-panel-head">
      <div class="pk-fig-title">
        <span class="pk-fig-no">{{ t('fig_1') }}</span>
        <h2 class="pk-fig-name">
          {{ t('panel_original') }}
        </h2>
      </div>
    </header>

    <div
      class="relative flex min-h-[260px] flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--pk-line)] transition-colors hover:border-[var(--pk-primary)]"
      :class="{ 'pk-flash': flash }"
      role="button"
      tabindex="0"
      @click="$emit('activate')"
      @keydown.enter.prevent="$emit('activate')"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <ViewfinderCorners :active="recognizing" />

      <img
        v-if="src"
        :src="src"
        alt="original formula"
        class="max-h-[440px] max-w-full object-contain p-8"
      >
      <div
        v-else
        class="flex flex-col items-center gap-3 px-6 py-14 text-center"
      >
        <span class="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[var(--pk-icon)]">
          <span class="pk-serif text-4xl font-bold text-[var(--pk-primary)]">Σ</span>
          <span class="absolute left-1/2 top-[-26px] h-[18px] w-px bg-[var(--pk-grid-bold)]" />
          <span class="absolute bottom-[-26px] left-1/2 h-[18px] w-px bg-[var(--pk-grid-bold)]" />
          <span class="absolute left-[-26px] top-1/2 h-px w-[18px] bg-[var(--pk-grid-bold)]" />
          <span class="absolute right-[-26px] top-1/2 h-px w-[18px] bg-[var(--pk-grid-bold)]" />
        </span>
        <p class="pk-serif text-base font-semibold text-[var(--pk-ink)]">
          {{ t('empty_original') }}
        </p>
        <button
          type="button"
          class="pk-btn pk-btn-outline pk-btn-sm mt-1"
          @click.stop="$emit('example')"
        >
          <UIcon
            name="i-lucide-image"
            class="h-3.5 w-3.5"
          />
          {{ t('upload_example') }}
        </button>
      </div>

      <p
        v-if="recognizing"
        class="absolute bottom-3 z-20 rounded-full bg-[var(--pk-panel)] px-3 py-1 text-xs text-[var(--pk-primary)] shadow-sm"
      >
        {{ t('focus_recognizing') }}
      </p>
    </div>

    <p
      v-if="warning"
      class="mt-2 rounded-md bg-[var(--pk-warn-bg)] px-2.5 py-1.5 text-xs text-[var(--pk-warn)]"
    >
      {{ warning }}
    </p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  src: string | null
  recognizing: boolean
  flash: boolean
  warning: string | null
}>()

const emit = defineEmits<{
  'activate': []
  'example': []
  'drop-file': [file: File]
}>()

const { t } = useI18n()

function onDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file) emit('drop-file', file)
}
</script>
