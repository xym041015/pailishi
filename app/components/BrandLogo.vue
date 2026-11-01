<template>
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="SnapLaTeX"
  >
    <rect
      v-if="!chalk"
      width="100"
      height="100"
      rx="22"
      class="fill-[var(--pk-primary)]"
    />
    <g
      class="stroke-white"
      stroke-width="7"
      stroke-linecap="round"
      fill="none"
    >
      <path d="M20 36 V27 a7 7 0 0 1 7 -7 H36" />
      <path d="M64 20 h9 a7 7 0 0 1 7 7 v9" />
      <path d="M80 64 v9 a7 7 0 0 1 -7 7 h-9" />
      <path d="M36 80 h-9 a7 7 0 0 1 -7 -7 v-9" />
    </g>
    <path
      d="M35 33 H65 V41 L49 50 L65 59 V67 H35 V59 L51 50 L35 41 Z"
      class="fill-white"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ chalk?: boolean }>(), { chalk: false })
</script>
