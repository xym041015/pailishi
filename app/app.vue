<script setup>
const { t, locale } = useI18n()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: computed(() => locale.value)
  }
})

const title = computed(() => `${t('appName')} — ${t('slogan')}`)
const description = t('description')

useSeoMeta({
  title,
  description,
  ogType: 'website',
  ogTitle: title,
  ogDescription: description,
  robots: 'index, follow'
})
</script>

<template>
  <UApp>
    <NuxtPwaManifest />

    <div
      class="pk-math-bg"
      aria-hidden="true"
    >
      <span class="pk-g-pi">π</span>
      <span class="pk-g-sum">∑</span>
      <span class="pk-g-int">∫</span>
      <span class="pk-g-inf">∞</span>
      <span class="pk-g-theta">θ</span>
      <span class="pk-g-root">√</span>
    </div>

    <div class="flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <main class="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>
