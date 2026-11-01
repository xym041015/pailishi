<script setup lang="ts">
// 工作台即首页：/ 永久指向识别工作台（routeRules 已配 302，这里只是兜底）
await navigateTo('/ocr', { redirectCode: 302 })
</script>

<template>
  <div />
</template>
