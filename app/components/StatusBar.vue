<template>
  <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-1 py-2 text-xs text-[var(--pk-muted)]">
    <span><span class="mr-1 text-[var(--pk-success)]">●</span>{{ t('status_local') }}</span>
    <span class="hidden text-[var(--pk-icon)] md:inline">{{ t('footer_brand') }}</span>
    <span>{{ t('status_draft') }}</span>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
