<script setup lang="ts">
import { en, zh_cn } from '@nuxt/ui/locale'

const { t, locale, setLocale } = useI18n()
const route = useRoute()
const colorMode = useColorMode()
// 按钮显示的是切换目标：夜间模式显示太阳（点击回到白天），日间模式显示月亮
const isDark = computed(() => colorMode.value === 'dark')
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-[rgba(0,0,0,0.28)] bg-[var(--pk-board)]">
    <div class="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4">
      <NuxtLink
        to="/"
        class="flex min-w-0 items-center gap-2.5"
      >
        <BrandLogo
          chalk
          class="h-8 w-8 shrink-0"
        />
        <!-- 手机端只留 logo 方块：窄屏放不下品牌字（会被挤成竖排/叠到导航上） -->
        <span class="pk-serif hidden text-xl font-bold tracking-wide text-white sm:inline">{{ t('appName') }}</span>
      </NuxtLink>

      <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <NuxtLink
          to="/"
          class="rounded-md px-2 py-1.5 text-[13px] sm:px-3 sm:text-sm"
          :class="route.path === '/' ? 'bg-[rgba(255,255,255,0.16)] font-semibold text-white' : 'text-[var(--pk-chalk-dim)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'"
        >
          {{ t('nav_home') }}
        </NuxtLink>
        <NuxtLink
          to="/ocr"
          class="rounded-md px-2 py-1.5 text-[13px] sm:px-3 sm:text-sm"
          :class="route.path.startsWith('/ocr') ? 'bg-[rgba(255,255,255,0.16)] font-semibold text-white' : 'text-[var(--pk-chalk-dim)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'"
        >
          {{ t('home_nav_workspace') }}
        </NuxtLink>
        <NuxtLink
          to="/guide"
          class="rounded-md px-2 py-1.5 text-[13px] sm:px-3 sm:text-sm"
          :class="route.path.startsWith('/guide') ? 'bg-[rgba(255,255,255,0.16)] font-semibold text-white' : 'text-[var(--pk-chalk-dim)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'"
        >
          {{ t('guide_nav') }}
        </NuxtLink>
        <ULocaleSelect
          v-model="locale"
          :locales="[zh_cn, en]"
          size="xs"
          class="w-24 sm:w-28 [&>button]:bg-[rgba(255,255,255,0.12)] [&>button]:text-white [&>button]:border-[rgba(255,255,255,0.25)]"
          @update:model-value="setLocale($event as 'en' | 'zh-CN')"
        />
        <UTooltip :text="isDark ? '切换到日间模式' : '切换到夜间模式'">
          <ClientOnly>
            <UButton
              :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
              color="neutral"
              variant="ghost"
              aria-label="切换日间 / 夜间模式"
              class="rounded-md border border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.2)]"
              @click="colorMode.preference = isDark ? 'light' : 'dark'"
            />
            <template #fallback>
              <div class="size-8" />
            </template>
          </ClientOnly>
        </UTooltip>
        <UTooltip
          text="GitHub 仓库（AGPL-3.0）"
          class="hidden sm:inline-flex"
        >
          <UButton
            to="https://github.com/xym041015/pailishi"
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
