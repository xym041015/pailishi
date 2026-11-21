<script setup lang="ts">
import type { HistoryItem } from '../composables/useRecognitionHistory'

defineProps<{ open: boolean, items: HistoryItem[] }>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  'restore': [latex: string]
  'remove': [id: string]
  'clear': []
}>()

const { t } = useI18n()
const confirmClear = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function onClear() {
  if (!confirmClear.value) {
    confirmClear.value = true
    timer = setTimeout(() => {
      confirmClear.value = false
    }, 3000)
    return
  }
  if (timer) clearTimeout(timer)
  confirmClear.value = false
  emit('clear')
}
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

function fmt(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function onRestore(it: HistoryItem) {
  emit('restore', it.latex)
  emit('update:open', false)
}
</script>

<template>
  <USlideover
    :open="open"
    :title="t('history_title')"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <div class="mb-3 flex items-center justify-between">
        <span class="rounded-full bg-[var(--pk-primary-soft)] px-2 py-0.5 text-xs text-[var(--pk-primary)]">{{ items.length }}</span>
        <button
          v-if="items.length"
          type="button"
          class="text-xs text-[var(--pk-muted)] hover:text-[var(--pk-primary)]"
          @click="onClear"
        >
          {{ confirmClear ? t('history_clear_confirm') : t('history_clear') }}
        </button>
      </div>
      <div
        v-if="!items.length"
        class="py-10 text-center"
      >
        <span class="pk-serif text-3xl text-[var(--pk-muted)]">Σ</span>
        <p class="mt-3 text-xs leading-5 text-[var(--pk-muted)]">
          {{ t('history_empty') }}
        </p>
      </div>
      <div
        v-else
        class="space-y-2"
      >
        <div
          v-for="it in items"
          :key="it.id"
          class="group flex cursor-pointer gap-2.5 rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-2.5 hover:border-[var(--pk-primary)]"
          @click="onRestore(it)"
        >
          <img
            v-if="it.thumb"
            :src="it.thumb"
            class="h-12 w-12 shrink-0 rounded border border-[var(--pk-line)] object-cover"
            alt=""
          >
          <span
            v-else
            class="pk-serif flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[var(--pk-line)] text-xl text-[var(--pk-muted)]"
          >Σ</span>
          <div class="min-w-0 flex-1">
            <p class="line-clamp-2 break-all font-mono text-xs leading-4 text-[var(--pk-ink)]">
              {{ it.latex }}
            </p>
            <p class="mt-1.5 flex items-center gap-1.5 text-[10px] text-[var(--pk-muted)]">
              <span>{{ fmt(it.ts) }}</span>
              <span class="rounded bg-[var(--pk-primary-soft)] px-1.5 py-0.5 text-[var(--pk-primary)]">{{ it.engine }}</span>
              <span class="rounded bg-[var(--pk-edit-bg)] px-1.5 py-0.5">{{ it.source === 'write' ? t('history_source_write') : t('history_source_ocr') }}</span>
            </p>
          </div>
          <button
            type="button"
            class="h-6 w-6 shrink-0 rounded text-[var(--pk-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[#d4574e]"
            :aria-label="t('write_clear')"
            @click.stop="$emit('remove', it.id)"
          >
            <UIcon
              name="i-lucide-x"
              class="h-4 w-4"
            />
          </button>
        </div>
      </div>
    </template>
  </USlideover>
</template>
