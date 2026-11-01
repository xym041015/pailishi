<template>
  <span
    class="pointer-events-none absolute inset-0 z-10"
    aria-hidden="true"
    :class="{ 'pk-focus-ring': active }"
  >
    <span class="absolute left-2 top-2 h-6 w-6 rounded-tl border-l-2 border-t-2 border-[var(--pk-primary)]" />
    <span class="absolute right-2 top-2 h-6 w-6 rounded-tr border-r-2 border-t-2 border-[var(--pk-primary)]" />
    <span class="absolute bottom-2 left-2 h-6 w-6 rounded-bl border-b-2 border-l-2 border-[var(--pk-primary)]" />
    <span class="absolute bottom-2 right-2 h-6 w-6 rounded-br border-b-2 border-r-2 border-[var(--pk-primary)]" />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ active?: boolean }>(), { active: false })
</script>
