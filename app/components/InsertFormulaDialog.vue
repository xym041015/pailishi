<template>
  <UModal
    v-model:open="openProxy"
    :title="t('insert_formula')"
  >
    <template #body>
      <div class="space-y-3">
        <UTextarea
          v-model="code"
          :rows="3"
          autoresize
          class="w-full font-mono"
          :placeholder="t('insert_latex')"
        />
        <div>
          <p class="mb-1 text-xs text-[var(--pk-muted)]">
            {{ t('insert_preview') }}
          </p>
          <div class="min-h-[64px] overflow-auto rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
            <div
              v-if="code"
              class="pk-katex"
              v-html="preview"
            />
            <span
              v-else
              class="text-xs text-[var(--pk-muted)]"
            >
              —
            </span>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <button
          type="button"
          class="pk-btn pk-btn-outline"
          :disabled="!code"
          @click="insert(false)"
        >
          {{ t('insert_inline') }}
        </button>
        <button
          type="button"
          class="pk-btn pk-btn-solid"
          :disabled="!code"
          @click="insert(true)"
        >
          {{ t('insert_display') }}
        </button>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import katex from 'katex'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'insert': [code: string, display: boolean]
}>()

const { t } = useI18n()

const openProxy = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const code = ref('')

const preview = computed(() => {
  if (!code.value) return ''
  return katex.renderToString(code.value, {
    throwOnError: false,
    displayMode: true
  })
})

watch(() => props.open, (value) => {
  if (value) code.value = ''
})

function insert(display: boolean) {
  emit('insert', code.value, display)
  openProxy.value = false
}
</script>
