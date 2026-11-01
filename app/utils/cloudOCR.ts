/*
  模块 5：BYO key 云端识别通道（ZCode 式供应商模型）。
  统一概念：供应商列表（本地 + 预设 + 自定义），每家各自保存 key，
  选中哪家用哪家；key 只存 localStorage，请求由浏览器直连厂商。
*/

export type ProviderProtocol = 'local' | 'openai-chat' | 'openai-responses' | 'anthropic' | 'simpletex'
export type SimpleTexModel = 'turbo' | 'standard'

export interface ProviderConfig {
  protocol: ProviderProtocol
  baseUrl: string
  key: string
  model: string
  simpletexModel: 'turbo' | 'standard'
  name?: string
}

export interface EngineSettings {
  activeId: string
  customIds: string[]
  providers: Record<string, ProviderConfig>
}

export interface ProviderPreset {
  id: string
  label: string
  protocol: ProviderProtocol
  baseUrl: string
  model: string
}

export const OPENAI_PROMPT
  = 'Recognize the mathematical formula in this image. Output ONLY the LaTeX code of the formula, with no explanations, no markdown fences, no $ delimiters.'

export const LOCAL_PROVIDER_ID = 'local'
export const CUSTOM_PROVIDER_ID = 'custom'

export const SIMPLETEX_DEFAULT_BASE_URL = 'https://server.simpletex.cn'
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

/*
  供应商预设（2026-10 核对各官方文档，端点/模型名随厂商更新，字段均可改）。
  openai 协议 = /chat/completions + Bearer 鉴权；simpletex 协议 = token 头 + multipart file。
*/
export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'local', label: '本地模型 · 免费', protocol: 'local', baseUrl: '', model: '' },
  { id: 'openai', label: 'OpenAI', protocol: 'openai-chat', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  {
    id: 'qwen',
    label: '通义千问 · 阿里云百炼',
    protocol: 'openai-chat',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-plus'
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    protocol: 'openai-chat',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-5.3-flash'
  },
  {
    id: 'siliconflow',
    label: '硅基流动 SiliconFlow',
    protocol: 'openai-chat',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-VL-32B-Instruct'
  },
  {
    id: 'doubao',
    label: '豆包 · 火山方舟',
    protocol: 'openai-chat',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-1.5-vision-pro-32k'
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-5'
  },
  {
    id: 'openai-responses',
    label: 'OpenAI Responses',
    protocol: 'openai-responses',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  },
  {
    id: 'kimi',
    label: '月之暗面 Kimi',
    protocol: 'openai-chat',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-latest'
  },
  {
    id: 'ollama',
    label: 'Ollama 本地',
    protocol: 'openai-chat',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5vl'
  },
  {
    id: 'simpletex',
    label: 'SimpleTex',
    protocol: 'simpletex',
    baseUrl: SIMPLETEX_DEFAULT_BASE_URL,
    model: 'turbo'
  }
]

const STORAGE_KEY = 'pailishi-engine'

function defaultProviderConfig(preset: ProviderPreset): ProviderConfig {
  return {
    protocol: preset.protocol,
    baseUrl: preset.baseUrl,
    key: '',
    model: preset.model,
    simpletexModel: 'turbo'
  }
}

export function defaultEngineSettings(): EngineSettings {
  const providers: Record<string, ProviderConfig> = {}
  for (const preset of PROVIDER_PRESETS) providers[preset.id] = defaultProviderConfig(preset)
  return { activeId: LOCAL_PROVIDER_ID, customIds: [], providers }
}

export function loadEngineSettings(): EngineSettings {
  const base = defaultEngineSettings()
  if (typeof localStorage === 'undefined') return base
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as {
      activeId?: string
      customIds?: string[]
      providers?: Record<string, Partial<ProviderConfig>>
      // v1 旧结构迁移
      engine?: string
      openai?: Partial<ProviderConfig>
      simpletexToken?: string
    }
    const providers = base.providers
    let activeId = parsed.activeId ?? base.activeId
    let customIds = parsed.customIds ?? []

    if (parsed.engine && !parsed.providers) {
      // v1 → v2 迁移
      if (parsed.engine === 'openai' && parsed.openai?.key) {
        const prev = providers.openai!
        providers.openai = {
          ...prev,
          key: parsed.openai.key || '',
          baseUrl: parsed.openai.baseUrl || prev.baseUrl,
          model: parsed.openai.model || prev.model
        }
        activeId = 'openai'
      } else if (parsed.engine === 'simpletex' && parsed.simpletexToken) {
        providers.simpletex = { ...providers.simpletex!, key: parsed.simpletexToken }
        activeId = 'simpletex'
      }
    }

    // v2 单自定义槽 → 多自定义供应商迁移
    const legacyCustom = parsed.providers?.[CUSTOM_PROVIDER_ID]
    if (legacyCustom && (!customIds || customIds.length === 0)) {
      const newId = 'custom-1'
      providers[newId] = {
        protocol: legacyCustom.protocol === 'simpletex' ? 'simpletex' : 'openai-chat',
        baseUrl: legacyCustom.baseUrl ?? '',
        key: legacyCustom.key ?? '',
        model: legacyCustom.model ?? '',
        simpletexModel: legacyCustom.simpletexModel === 'standard' ? 'standard' : 'turbo',
        name: customProviderName(newId)
      }
      customIds = [newId]
      if (activeId === CUSTOM_PROVIDER_ID) activeId = newId
    }
    const { [CUSTOM_PROVIDER_ID]: _legacy, ...restProviders } = providers

    for (const id of customIds) {
      if (!restProviders[id]) {
        restProviders[id] = {
          protocol: 'openai-chat',
          baseUrl: '',
          key: '',
          model: '',
          simpletexModel: 'turbo',
          name: customProviderName(id)
        }
      }
    }

    for (const id of Object.keys(restProviders)) {
      const saved = parsed.providers?.[id]
      const current = restProviders[id]!
      if (!saved || !current) continue
      restProviders[id] = {
        protocol: current.protocol,
        baseUrl: saved.baseUrl ?? current.baseUrl,
        key: saved.key ?? '',
        model: saved.model ?? current.model,
        simpletexModel: saved.simpletexModel === 'standard' ? 'standard' : 'turbo',
        name: saved.name ?? current.name
      }
    }
    customIds = customIds.filter(id => restProviders[id])
    if (!restProviders[activeId]) activeId = LOCAL_PROVIDER_ID
    return { activeId, customIds, providers: restProviders }
  } catch {
    return base
  }
}

export function saveEngineSettings(settings: EngineSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export interface ActiveProvider {
  id: string
  config: ProviderConfig
}

/* 取当前激活的云端供应商；本地返回 null（零拦截的关键判定） */
export function getActiveCloudProvider(settings: EngineSettings): ActiveProvider | null {
  if (settings.activeId === LOCAL_PROVIDER_ID) return null
  const config = settings.providers[settings.activeId]
  if (!config) return null
  if (settings.activeId.startsWith('custom-')) {
    if (!config.key || !config.baseUrl) return null
  } else if (!config.key) {
    return null
  }
  return { id: settings.activeId, config }
}

export function customProviderName(id: string): string {
  const seq = id.replace('custom-', '')
  return seq ? `自定义 ${seq}` : '自定义'
}

export function createCustomProvider(settings: EngineSettings): { settings: EngineSettings, newId: string } {
  const next = JSON.parse(JSON.stringify(settings))
  let seq = next.customIds.length + 1
  let id = `custom-${seq}`
  while (next.providers[id]) {
    seq++
    id = `custom-${seq}`
  }
  next.customIds.push(id)
  next.providers[id] = {
    protocol: 'openai-chat',
    baseUrl: '',
    key: '',
    model: '',
    simpletexModel: 'turbo',
    name: customProviderName(id)
  }
  next.activeId = id
  return { settings: next, newId: id }
}

export function removeCustomProvider(settings: EngineSettings, id: string): EngineSettings {
  const next = JSON.parse(JSON.stringify(settings))
  next.customIds = next.customIds.filter((x: string) => x !== id)
  const { [id]: _removed, ...rest } = next.providers
  next.providers = rest
  if (next.activeId === id) next.activeId = LOCAL_PROVIDER_ID
  return next
}

export function maskKey(key: string): string {
  if (!key) return ''
  return `${key.slice(0, 4)}***`
}

/* 报错文本里若意外带了 key，统一脱敏 */
export function sanitizeError(text: string, ...secrets: string[]) {
  let out = text
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join(maskKey(secret))
  }
  return out
}

function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('failed to read image file'))
    reader.readAsDataURL(file)
  })
}

export interface CloudOCRResult {
  latex: string
  confidence: number | null
}

export async function recognizeWithProvider(provider: ActiveProvider, file: File): Promise<CloudOCRResult> {
  if (provider.config.protocol === 'simpletex') {
    return recognizeWithSimpleTex(file, provider.config)
  }
  if (provider.config.protocol === 'anthropic') {
    return recognizeWithAnthropic(file, provider.config)
  }
  if (provider.config.protocol === 'openai-responses') {
    return recognizeWithOpenAIResponses(file, provider.config)
  }
  return recognizeWithOpenAI(file, provider.config)
}

export async function recognizeWithOpenAI(file: File, config: ProviderConfig): Promise<CloudOCRResult> {
  const dataUrl = await fileToBase64DataUrl(file)
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: OPENAI_PROMPT }
          ]
        }]
      })
    })
  } catch (err) {
    throw new Error(sanitizeError(`network error: ${String(err)}`, config.key))
  }
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(sanitizeError(`HTTP ${response.status} ${bodyText.slice(0, 200)}`, config.key))
  }
  const json = await response.json()
  const content: string = json?.choices?.[0]?.message?.content ?? ''
  const latex = content
    .replace(/```(?:latex|tex)?\s*/g, '')
    .replace(/```/g, '')
    .trim()
  if (!latex) throw new Error('empty response from model')
  return { latex, confidence: null }
}

// Anthropic Messages API：x-api-key + anthropic-version 头，图片走 base64 content block
export async function recognizeWithAnthropic(file: File, config: ProviderConfig): Promise<CloudOCRResult> {
  const dataUrl = await fileToBase64DataUrl(file)
  const base64 = dataUrl.split(',')[1]!
  const mediaType = file.type || 'image/png'
  const endpoint = config.baseUrl.replace(/\/+$/, '') + '/v1/messages'
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: OPENAI_PROMPT }
          ]
        }]
      })
    })
  } catch (err) {
    throw new Error(sanitizeError(`network error: ${String(err)}`, config.key))
  }
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(sanitizeError(`HTTP ${response.status} ${bodyText.slice(0, 200)}`, config.key))
  }
  const json = await response.json()
  const content: string = (json?.content ?? [])
    .filter((block: { type?: string }) => block?.type === 'text')
    .map((block: { text?: string }) => block?.text ?? '')
    .join('')
  const latex = content
    .replace(/```(?:latex|tex)?\s*/g, '')
    .replace(/```/g, '')
    .trim()
  if (!latex) throw new Error('empty response from model')
  return { latex, confidence: null }
}

// OpenAI Responses API：/v1/responses，input 数组 + input_image（data URL 直接可用）
export async function recognizeWithOpenAIResponses(file: File, config: ProviderConfig): Promise<CloudOCRResult> {
  const dataUrl = await fileToBase64DataUrl(file)
  const trimmedBase = config.baseUrl.replace(/\/+$/, '')
  const endpoint = trimmedBase.endsWith('/responses') ? trimmedBase : `${trimmedBase}/responses`
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: config.model,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: OPENAI_PROMPT },
            { type: 'input_image', image_url: dataUrl }
          ]
        }]
      })
    })
  } catch (err) {
    throw new Error(sanitizeError(`network error: ${String(err)}`, config.key))
  }
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(sanitizeError(`HTTP ${response.status} ${bodyText.slice(0, 200)}`, config.key))
  }
  const json = await response.json()
  const content: string = json?.output_text
    ?? (json?.output ?? [])
      .filter((item: { type?: string }) => item?.type === 'message')
      .flatMap((item: { content?: Array<{ type?: string, text?: string }> }) => item?.content ?? [])
      .filter((part: { type?: string }) => part?.type === 'output_text')
      .map((part: { text?: string }) => part?.text ?? '')
      .join('')
  const latex = content
    .replace(/```(?:latex|tex)?\s*/g, '')
    .replace(/```/g, '')
    .trim()
  if (!latex) throw new Error('empty response from model')
  return { latex, confidence: null }
}

export async function recognizeWithSimpleTex(file: File, config: ProviderConfig): Promise<CloudOCRResult> {
  // 轻量 = /api/latex_ocr_turbo（快，累计免费 1000 次）；标准 = /api/latex_ocr（准，累计免费 500 次）
  const path = config.simpletexModel === 'standard' ? '/api/latex_ocr' : '/api/latex_ocr_turbo'
  const endpoint = config.baseUrl.replace(/\/+$/, '') + path
  const form = new FormData()
  form.append('image', file)
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { token: config.key },
      body: form
    })
  } catch (err) {
    throw new Error(sanitizeError(`network error: ${String(err)}`, config.key))
  }
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(sanitizeError(`HTTP ${response.status} ${bodyText.slice(0, 200)}`, config.key))
  }
  const json = await response.json()
  if (json?.status === false) {
    throw new Error(`SimpleTex error: ${json?.error_type || json?.res?.error_type || 'unknown'} (request_id: ${json?.request_id || '-'})`)
  }
  // 官方返回结构：{ status, res: { latex, confidence, ... }, request_id }——结果在 res 字段里
  const res = json?.res ?? json
  const latex: string = res?.latex ?? ''
  const rawConfidence = res?.confidence
  let confidence: number | null = null
  if (typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)) {
    confidence = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence)
  }
  if (!latex) throw new Error('empty response from SimpleTex')
  return { latex, confidence }
}
