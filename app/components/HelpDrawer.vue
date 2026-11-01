<template>
  <USlideover
    :open="open"
    :title="t('help_title')"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1 text-xs font-semibold text-[var(--pk-primary)]">
            {{ t('help_item_word') }}
          </p>
          <p class="text-sm text-[var(--pk-muted)]">
            {{ t('help_word_version') }}
          </p>
        </div>
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1 text-xs font-semibold text-[var(--pk-primary)]">
            {{ t('help_item_safari') }}
          </p>
          <p class="text-sm text-[var(--pk-muted)]">
            {{ t('help_safari_capture') }}
          </p>
        </div>
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1 text-xs font-semibold text-[var(--pk-primary)]">
            {{ t('help_item_model') }}
          </p>
          <p class="text-sm text-[var(--pk-muted)]">
            {{ t('help_model') }}
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()

defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
</script>
