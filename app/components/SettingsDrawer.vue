<template>
  <USlideover
    :open="open"
    :title="t('settings_title')"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <p class="mb-2 text-xs font-semibold text-[var(--pk-muted)]">
        {{ t('settings_provider') }}
      </p>

      <div class="space-y-1.5">
        <label
          v-for="preset in presets"
          :key="preset.id"
          class="flex cursor-pointer items-center gap-2.5 rounded-md border bg-[var(--pk-edit-bg)] p-2.5 text-sm"
          :class="local.activeId === preset.id ? 'border-[var(--pk-primary)] bg-[var(--pk-primary-soft)]' : 'border-[var(--pk-line)]'"
        >
          <input
            v-model="local.activeId"
            type="radio"
            name="provider"
            :value="preset.id"
            class="accent-[var(--pk-primary)]"
            @change="changed"
          >
          <span class="text-[var(--pk-ink)]">{{ preset.label }}</span>
        </label>

        <label
          v-for="id in local.customIds"
          :key="id"
          class="flex cursor-pointer items-center gap-2.5 rounded-md border bg-[var(--pk-edit-bg)] p-2.5 text-sm"
          :class="local.activeId === id ? 'border-[var(--pk-primary)] bg-[var(--pk-primary-soft)]' : 'border-[var(--pk-line)]'"
        >
          <input
            v-model="local.activeId"
            type="radio"
            name="provider"
            :value="id"
            class="accent-[var(--pk-primary)]"
            @change="changed"
          >
          <span class="text-[var(--pk-ink)]">{{ customLabel(id) }}</span>
        </label>

        <button
          type="button"
          class="pk-btn pk-btn-outline pk-btn-sm w-full"
          @click="addCustom"
        >
          {{ t('add_provider') }}
        </button>
      </div>

      <div
        v-if="activeConfig"
        class="mt-4 space-y-2"
      >
        <p class="text-xs text-[var(--pk-muted)]">
          {{ t('active_provider_note') }}
        </p>

        <template v-if="activeConfig.protocol !== 'local'">
          <label
            v-if="isCustomActive"
            class="block"
          >
            <span class="mb-1 block text-xs text-[var(--pk-muted)]">{{ t('provider_name') }}</span>
            <input
              v-model="activeConfig.name"
              type="text"
              :placeholder="customLabel(local.activeId)"
              class="w-full rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] px-2.5 py-1.5 text-xs text-[var(--pk-ink)]"
              @input="changed"
            >
          </label>

          <label
            v-if="isCustomActive"
            class="block"
          >
            <span class="mb-1 block text-xs text-[var(--pk-muted)]">{{ t('provider_protocol') }}</span>
            <select
              v-model="activeConfig.protocol"
              class="w-full rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] px-2.5 py-1.5 text-xs text-[var(--pk-ink)]"
              @change="onProtocolChange"
            >
              <option value="openai-chat">
                {{ t('protocol_openai') }}
              </option>
              <option value="openai-responses">
                {{ t('protocol_openai_responses') }}
              </option>
              <option value="anthropic">
                {{ t('protocol_anthropic') }}
              </option>
              <option value="simpletex">
                {{ t('protocol_simpletex') }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1 block text-xs text-[var(--pk-muted)]">
              {{ activeConfig.protocol === 'simpletex' ? t('simpletex_token') : t('openai_key') }}
            </span>
            <input
              v-model="activeConfig.key"
              type="password"
              autocomplete="off"
              :placeholder="activeConfig.protocol === 'simpletex' ? t('simpletex_token_ph') : t('openai_key_ph')"
              class="w-full rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] px-2.5 py-1.5 font-mono text-xs text-[var(--pk-ink)]"
              @input="changed"
            >
          </label>

          <template v-if="activeConfig.protocol === 'simpletex'">
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--pk-muted)]">{{ t('simpletex_model') }}</span>
              <select
                v-model="activeConfig.simpletexModel"
                class="w-full rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] px-2.5 py-1.5 text-xs text-[var(--pk-ink)]"
                @change="changed"
              >
                <option value="turbo">
                  {{ t('simpletex_model_turbo') }}
                </option>
                <option value="standard">
                  {{ t('simpletex_model_standard') }}
                </option>
              </select>
            </label>
          </template>

          <label class="block">
            <span class="mb-1 block text-xs text-[var(--pk-muted)]">{{ t('simpletex_base_url') }}</span>
            <input
              v-model="activeConfig.baseUrl"
              type="text"
              class="w-full rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] px-2.5 py-1.5 font-mono text-xs text-[var(--pk-ink)]"
              @input="changed"
            >
          </label>

          <label
            v-if="activeConfig.protocol !== 'simpletex'"
            class="block"
          >
            <span class="mb-1 block text-xs text-[var(--pk-muted)]">{{ t('openai_model') }}</span>
            <input
              v-model="activeConfig.model"
              type="text"
              :placeholder="t('openai_model_ph')"
              class="w-full rounded-md border border-[var(--pk-line)] bg-[var(--pk-edit-bg)] px-2.5 py-1.5 font-mono text-xs text-[var(--pk-ink)]"
              @input="changed"
            >
          </label>

          <p
            v-if="local.activeId === 'doubao'"
            class="text-xs text-[var(--pk-muted)]"
          >
            {{ t('preset_note') }}
          </p>

          <button
            v-if="isCustomActive"
            type="button"
            class="pk-btn pk-btn-dashed pk-btn-sm"
            @click="removeCustom"
          >
            {{ t('delete_provider') }}
          </button>
        </template>

        <p
          v-else
          class="text-xs text-[var(--pk-muted)]"
        >
          {{ t('local_provider_note') }}
        </p>

        <div
          v-if="activeConfig && activeConfig.protocol !== 'local'"
          class="rounded-md bg-[var(--pk-highlight-soft)] p-3"
        >
          <p class="text-xs text-[var(--pk-ink)]">
            {{ t('keys_local_note') }}
          </p>
          <button
            type="button"
            class="pk-btn pk-btn-outline pk-btn-sm mt-2"
            @click="clearActiveKey"
          >
            {{ t('clear_keys') }}
          </button>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import {
  type EngineSettings,
  PROVIDER_PRESETS,
  SIMPLETEX_DEFAULT_BASE_URL,
  customProviderName,
  createCustomProvider,
  removeCustomProvider
} from '../utils/cloudOCR'

const props = defineProps<{ open: boolean, settings: EngineSettings }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [settings: EngineSettings]
}>()

const { t } = useI18n()

const local = ref<EngineSettings>(JSON.parse(JSON.stringify(props.settings)))

const presets = PROVIDER_PRESETS

const isCustomActive = computed(() => local.value.activeId.startsWith('custom-') || local.value.activeId === CUSTOM_PROVIDER_ID)

const activeConfig = computed(() => local.value.providers[local.value.activeId] ?? null)

function customLabel(id: string) {
  const config = local.value.providers[id]
  return config?.name || customProviderName(id)
}

watch(() => props.open, (value) => {
  if (value) local.value = JSON.parse(JSON.stringify(props.settings))
})

function changed() {
  emit('save', JSON.parse(JSON.stringify(local.value)))
}

// 自定义供应商切协议时，若切到 simpletex 且 baseUrl 为空则自动填官方地址
function onProtocolChange() {
  if (activeConfig.value?.protocol === 'simpletex' && !activeConfig.value.baseUrl) {
    activeConfig.value.baseUrl = SIMPLETEX_DEFAULT_BASE_URL
  }
  changed()
}

function addCustom() {
  const next = createCustomProvider(local.value)
  local.value = next.settings
  changed()
}

function removeCustom() {
  local.value = removeCustomProvider(local.value, local.value.activeId)
  changed()
}

function clearActiveKey() {
  const config = local.value.providers[local.value.activeId]
  if (config) config.key = ''
  changed()
}
</script>
