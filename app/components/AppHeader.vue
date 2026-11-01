<script setup lang="ts">
import { en, zh_cn } from '@nuxt/ui/locale'

const { t, locale, setLocale } = useI18n()
const route = useRoute()
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-[rgba(0,0,0,0.28)] bg-[var(--pk-board)]">
    <div class="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4">
      <NuxtLink
        to="/ocr"
        class="flex min-w-0 items-center gap-2.5"
      >
        <BrandLogo
          chalk
          class="h-8 w-8 shrink-0"
        />
        <span class="pk-serif text-xl font-bold tracking-wide text-white">{{ t('appName') }}</span>
      </NuxtLink>

      <div class="flex shrink-0 items-center gap-2">
        <NuxtLink
          to="/ocr"
          class="rounded-md px-3 py-1.5 text-sm text-white"
          :class="route.path.startsWith('/ocr') ? 'bg-[rgba(255,255,255,0.16)] font-semibold' : 'text-[var(--pk-chalk-dim)] hover:bg-[rgba(255,255,255,0.1)]'"
        >
          {{ t('recognize') }}
        </NuxtLink>
        <ULocaleSelect
          v-model="locale"
          :locales="[zh_cn, en]"
          size="xs"
          class="w-28 [&>button]:bg-[rgba(255,255,255,0.12)] [&>button]:text-white [&>button]:border-[rgba(255,255,255,0.25)]"
          @update:model-value="setLocale($event as 'en' | 'zh-CN')"
        />
        <UColorModeButton class="[&>button]:text-white [&>button]:hover:bg-[rgba(255,255,255,0.12)]" />
        <UTooltip text="Texo (AGPL-3.0) upstream">
          <UButton
            to="https://github.com/alephpi/Texo-web"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            variant="ghost"
            class="text-white hover:bg-[rgba(255,255,255,0.12)]"
          />
        </UTooltip>
      </div>
    </div>
  </header>
</template>
