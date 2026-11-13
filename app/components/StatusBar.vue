<template>
  <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-1 py-2 text-xs text-[var(--pk-muted)]">
    <span><span class="mr-1 text-[var(--pk-success)]">●</span>{{ t('status_local') }}</span>
    <span class="hidden text-[var(--pk-icon)] md:inline">{{ t('footer_brand') }}</span>
    <span class="flex items-center gap-3">
      <span>{{ t('status_draft') }}</span>
      <a
        v-if="feedbackUrl"
        :href="feedbackUrl"
        target="_blank"
        rel="noopener"
        class="underline decoration-dotted underline-offset-2 hover:text-[var(--pk-primary)]"
      >{{ t('feedback_action') }}</a>
    </span>
  </div>
</template>

<script setup lang="ts">
import { FEEDBACK_URL } from '../utils/siteConfig'

const { t } = useI18n()
const feedbackUrl = FEEDBACK_URL
</script>
