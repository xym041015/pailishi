<template>
  <UModal
    v-model:open="openProxy"
    :title="t('guide_title')"
  >
    <template #body>
      <div class="space-y-3">
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1.5 text-xs font-semibold text-[var(--pk-primary)]">
            {{ t('guide_step1_title') }}
          </p>
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pk-ink)]">
            <span>macOS</span>
            <kbd class="pk-kbd">⌘</kbd>
            <kbd class="pk-kbd">⌃</kbd>
            <kbd class="pk-kbd">⇧</kbd>
            <kbd class="pk-kbd">4</kbd>
            <span class="text-[var(--pk-muted)]">/</span>
            <span>Windows</span>
            <kbd class="pk-kbd">Win</kbd>
            <kbd class="pk-kbd">⇧</kbd>
            <kbd class="pk-kbd">S</kbd>
          </p>
          <p class="mt-1.5 text-xs text-[var(--pk-muted)]">
            {{ t('guide_step1_desc') }}
          </p>
        </div>
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1.5 text-xs font-semibold text-[var(--pk-primary)]">
            {{ t('guide_step2_title') }}
          </p>
          <p class="flex flex-wrap items-center gap-1.5 text-sm text-[var(--pk-ink)]">
            <span>{{ t('guide_step2_desc') }}</span>
            <kbd class="pk-kbd">⌘V</kbd>
          </p>
        </div>
        <p class="text-xs text-[var(--pk-muted)]">
          {{ t('guide_note') }}
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <button
          type="button"
          class="pk-btn pk-btn-solid"
          @click="openProxy = false"
        >
          {{ t('guide_got_it') }}
        </button>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const openProxy = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})
</script>
