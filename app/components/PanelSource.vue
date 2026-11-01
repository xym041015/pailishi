<template>
  <section class="pk-panel flex flex-col">
    <header class="pk-panel-head">
      <div class="pk-fig-title">
        <span class="pk-fig-no">{{ t('fig_2') }}</span>
        <h2 class="pk-fig-name">
          {{ t('panel_source') }}
        </h2>
        <UTooltip
          :text="t('confidence_tooltip')"
          :delay-duration="0"
        >
          <span
            v-if="confidence !== null"
            class="pk-confidence"
            :class="confidence >= 80 ? 'pk-conf-good' : 'pk-conf-warn'"
          >
            {{ t('confidence_label') }} {{ confidence }}%
          </span>
        </UTooltip>
      </div>
      <div class="flex items-center gap-0.5">
        <UTooltip
          :text="t('insert_formula')"
          :delay-duration="0"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-sigma"
            class="pk-icon-btn"
            aria-label="insert formula"
            @click="$emit('insert')"
          />
        </UTooltip>
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
          :text="t('undo')"
          :delay-duration="0"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-undo-2"
            :disabled="!canUndo"
            class="pk-icon-btn"
            aria-label="undo"
            @click="$emit('undo')"
          />
        </UTooltip>
        <UTooltip
          :text="t('redo')"
          :delay-duration="0"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-redo-2"
            :disabled="!canRedo"
            class="pk-icon-btn"
            aria-label="redo"
            @click="$emit('redo')"
          />
        </UTooltip>
        <UTooltip
          :text="t('help')"
          :delay-duration="0"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-circle-help"
            class="pk-icon-btn"
            aria-label="help"
            @click="$emit('help')"
          />
        </UTooltip>
      </div>
    </header>

    <div class="min-h-[220px] flex-1">
      <UTextarea
        :model-value="code"
        :rows="6"
        :placeholder="t('edit_placeholder')"
        class="h-full w-full font-mono"
        :ui="{ base: 'h-full resize-none leading-relaxed' }"
        :style="{ fontSize: `${fontSize}px` }"
        @update:model-value="$emit('update:code', $event as string)"
      />
    </div>

    <footer class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pk-btn pk-btn-solid"
          :disabled="!code"
          @click="$emit('copy-word')"
        >
          <UIcon
            name="i-lucide-aperture"
            class="h-4 w-4"
          />
          {{ t('copy_word_formula') }}
        </button>
        <button
          type="button"
          class="pk-btn pk-btn-outline"
          :disabled="!code"
          @click="$emit('copy-latex')"
        >
          <UIcon
            name="i-lucide-clipboard"
            class="h-4 w-4"
          />
          {{ t('copy_latex') }}
        </button>
        <button
          type="button"
          class="pk-btn pk-btn-outline"
          :disabled="!code || exporting"
          @click="$emit('export-docx')"
        >
          <UIcon
            name="i-lucide-file-down"
            class="h-4 w-4"
            :class="{ 'animate-pulse': exporting }"
          />
          {{ t('export_docx') }}
        </button>
      </div>
      <div class="flex items-center gap-1">
        <UBadge
          color="neutral"
          variant="outline"
          size="sm"
          :label="t('autoCopy')"
        />
        <USelect
          :model-value="autoCopy"
          :items="autoCopyItems"
          size="xs"
          class="w-24"
          @update:model-value="$emit('update:autoCopy', $event as AutoCopyMode)"
        />
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
type AutoCopyMode = 'off' | 'latex' | 'mathml'

defineProps<{
  code: string
  fontSize: number
  canUndo: boolean
  canRedo: boolean
  autoCopy: AutoCopyMode
  exporting: boolean
  confidence: number | null
}>()

defineEmits<{
  'update:code': [value: string]
  'update:autoCopy': [value: AutoCopyMode]
  'copy-word': []
  'copy-latex': []
  'export-docx': []
  'insert': []
  'font-plus': []
  'font-minus': []
  'undo': []
  'redo': []
  'help': []
}>()

const { t } = useI18n()

const autoCopyItems = computed(() => [
  { label: t('auto_copy_off'), value: 'off' },
  { label: 'LaTeX', value: 'latex' },
  { label: 'MathML', value: 'mathml' }
])
</script>
