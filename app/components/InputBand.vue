<template>
  <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-[var(--pk-line)] bg-[var(--pk-panel)] px-4 py-2.5">
    <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pk-muted)]">
      <span class="inline-flex items-center gap-1.5">
        <kbd class="pk-kbd">⌘V</kbd>{{ t('hint_paste') }}
      </span>
      <span class="text-[var(--pk-line)]">·</span>
      <span>{{ t('hint_drop') }}</span>
      <span class="text-[var(--pk-line)]">·</span>
      <span>{{ t('hint_click') }}</span>
    </p>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="pk-btn pk-btn-outline pk-btn-sm"
        @click="$emit('capture')"
      >
        <UIcon
          name="i-lucide-crop"
          class="h-3.5 w-3.5"
        />
        {{ t('select_screen') }}
      </button>
      <button
        type="button"
        class="pk-btn pk-btn-outline pk-btn-sm"
        :disabled="!hasImage || recognizing"
        @click="$emit('recapture')"
      >
        <UIcon
          name="i-lucide-rotate-cw"
          class="h-3.5 w-3.5"
        />
        {{ t('recapture') }}
      </button>
      <button
        type="button"
        class="pk-btn pk-btn-outline pk-btn-sm"
        :disabled="!hasContent"
        @click="$emit('clear')"
      >
        <UIcon
          name="i-lucide-eraser"
          class="h-3.5 w-3.5"
        />
        {{ t('clear') }}
      </button>
      <UTooltip
        :text="t('settings_title')"
        :delay-duration="0"
      >
        <button
          type="button"
          class="pk-btn pk-btn-outline pk-btn-sm"
          aria-label="settings"
          @click="$emit('settings')"
        >
          <UIcon
            name="i-lucide-settings-2"
            class="h-3.5 w-3.5"
          />
        </button>
      </UTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ hasImage: boolean, hasContent: boolean, recognizing: boolean }>()

defineEmits<{ recapture: [], clear: [], capture: [], settings: [] }>()

const { t } = useI18n()
</script>
