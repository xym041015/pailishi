<script setup lang="ts">
// 首访引导卡：仅首次打开工作台时展示一次，看完（或关闭）即记住
const STORAGE_KEY = 'pailishi-onboarding-v1'

const open = ref(false)

onMounted(() => {
  let seen = false
  try {
    seen = localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    seen = false
  }
  if (!seen) {
    setTimeout(() => {
      open.value = true
    }, 1200)
  }
})

function finish() {
  open.value = false
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* 隐私模式下写入失败也不影响使用 */
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="30 秒学会拍立式"
    @update:open="value => !value && finish()"
  >
    <template #body>
      <div class="space-y-3">
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--pk-primary)]">
            <UIcon
              name="i-lucide-crop"
              class="h-4 w-4"
            />
            截下公式
          </p>
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pk-ink)]">
            <span>Windows</span>
            <kbd class="pk-kbd">Win</kbd><kbd class="pk-kbd">⇧</kbd><kbd class="pk-kbd">S</kbd>
            <span class="text-[var(--pk-muted)]">/</span>
            <span>macOS</span>
            <kbd class="pk-kbd">⌘</kbd><kbd class="pk-kbd">⌃</kbd><kbd class="pk-kbd">⇧</kbd><kbd class="pk-kbd">4</kbd>
          </p>
        </div>
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--pk-primary)]">
            <UIcon
              name="i-lucide-clipboard-paste"
              class="h-4 w-4"
            />
            粘贴进来
          </p>
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pk-ink)]">
            <span>回到本页按</span>
            <kbd class="pk-kbd">Ctrl</kbd><kbd class="pk-kbd">V</kbd>
            <span class="text-[var(--pk-muted)]">/</span>
            <kbd class="pk-kbd">⌘V</kbd>
            <span class="text-[var(--pk-muted)]">也可拖入图片</span>
          </p>
        </div>
        <div class="rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] p-3">
          <p class="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--pk-primary)]">
            <UIcon
              name="i-lucide-file-text"
              class="h-4 w-4"
            />
            复制进 Word
          </p>
          <p class="text-sm text-[var(--pk-ink)]">
            点「复制成 Word 公式」，到 Word 里粘贴，就是可编辑的原生公式。
          </p>
        </div>
        <p class="flex items-start gap-1.5 text-xs leading-5 text-[var(--pk-muted)]">
          <UIcon
            name="i-lucide-info"
            class="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          <span>首次使用需下载约 80MB 识别模型，只需一次；图片全程不上传。</span>
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between">
        <NuxtLink
          to="/guide"
          class="pk-btn pk-btn-outline"
          @click="finish()"
        >
          查看完整教程
        </NuxtLink>
        <button
          type="button"
          class="pk-btn pk-btn-solid"
          @click="finish()"
        >
          开始使用
        </button>
      </div>
    </template>
  </UModal>
</template>
