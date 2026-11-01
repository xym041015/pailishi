<template>
  <span class="inline-flex items-center gap-2">
    <BrandLogo class="h-7 w-7 shrink-0" />
    <span class="text-lg font-semibold whitespace-nowrap text-[var(--pk-ink)]">{{ t('appName') }}</span>
  </span>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
