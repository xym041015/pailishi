import { ref, type Ref } from 'vue'
import { useOCR } from './useOCR'
import { getActiveCloudProvider, providerDisplayName, recognizeWithProvider, type EngineSettings } from '../utils/cloudOCR'
import { formatLatex, orthographyToLaTeX } from './textProcessor'
import { WorkerStatus, type ModelConfig } from './types'
import { useRecognitionHistory } from './useRecognitionHistory'
import { makeThumb } from '../utils/makeThumb'

/*
  从 ocr.vue 原样迁移的识别路由：云端优先（填了 key），否则本地模型；零拦截。
  与 ocr.vue 现行代码的三处有意差别（行为不变，详见 task-3-report）：
  1. runOCR 只负责路由 + toast + 返回格式化后的 LaTeX（失败 rethrow）；
     latexCode 写入 / maybeAutoCopy / svg→png 转换留在各页面（本地分支专属）。
  2. useOCR() 用 import.meta.client 守卫：它一被调用就 new OCRWorker()（SSR 包里
     编译成 new Worker(url)，Node 无 Worker 全局），而 /ocr 是预渲染页（ssr:true），
     setup 会在 Node 跑一遍。现行代码本来就是 onMounted 才调 useOCR()，守卫与之等价；
     服务端 stub 不会被触达——init/predict/isReady/progress 只在 onMounted 与用户手势里使用。
  3. toast 参数类型走 Nuxt auto-import（@nuxt/ui v4 根入口不 re-export useToast，
     `import type { useToast } from '@nuxt/ui'` 会 TS2614、子路径导出 TS2307），
     与 useModelLoadingToast.ts 直接裸用 useToast() 同一约定。
*/
export function useRecognize(options: { t: (k: string) => string, toast: ReturnType<typeof useToast>, source?: 'ocr' | 'write' }) {
  const { t, toast } = options
  const source = options.source ?? 'ocr'
  // 识别历史（Task 1 的存储 composable）：成功识别后自动写入；defaultStorage 内部
  // 已 try-catch 包住 localStorage，SSR 预渲染 setup 阶段安全（读到 null 即空列表）
  const history = useRecognitionHistory()
  const recognizing = ref(false)
  const confidenceValue: Ref<number | null> = ref(null)

  const { init, predict, isReady, progress } = import.meta.client
    ? useOCR()
    : {
        init: async (_model_config: ModelConfig) => ({ status: WorkerStatus.Ready }),
        predict: async (_image: File) => ({ status: WorkerStatus.Result, output: '', key: '' }),
        isReady: ref(false),
        progress: ref<Record<string, Record<string, number>>>({})
      }

  async function loadModel(model_config: ModelConfig) {
    await init(model_config)
  }

  async function runOCR(file: File, engineSettings: EngineSettings): Promise<string> {
    recognizing.value = true
    confidenceValue.value = null
    toast.clear()
    toast.add({
      id: 'predict',
      title: t('focus_recognizing'),
      color: 'info',
      duration: 0
    })

    const start = performance.now()

    try {
      let output = ''
      let confidence: number | null = null

      // 模块 5：供应商路由——没填 key 或选本地时走本地模型，零拦截
      const cloudProvider = getActiveCloudProvider(engineSettings)
      if (cloudProvider) {
        const cloud = await recognizeWithProvider(cloudProvider, file)
        output = cloud.latex
        confidence = cloud.confidence
      } else {
        if (!isReady.value) {
          throw new Error('本地模型还在首次下载中（约 80MB，只下载一次），请等顶部进度条完成后重试')
        }
        // svg→png 转换不在这里：那是 /ocr 输入带（粘贴 svg）的本地分支专属场景，
        // 由调用页在进入本函数前处理；手写板导出的就是 PNG 不需要
        const result = await predict(file)
        if (result.status !== 'result') {
          throw new Error(result.output || t('unknown_error'))
        }
        output = result.output || ''
      }

      const elapsedMs = performance.now() - start
      const timeStr = elapsedMs < 1000 ? `${Math.round(elapsedMs)} ms` : `${(elapsedMs / 1000).toFixed(2)} s`

      // 与现行代码同序：先格式化（可能抛错走失败 toast），再落 confidence / 成功 toast
      const formatted = orthographyToLaTeX(formatLatex(output))
      // 空输出视为失败（spec §7）：模型偶尔输出空串 / 云端返回空 latex。
      // 在此统一拦截（/ocr 与 /write 共用），不落 confidence、不弹成功 toast，
      // 走下方 catch 的失败 toast + rethrow，页面不会再看到「成功+失败」双 toast
      if (!formatted.trim()) {
        throw new Error(t('empty_output'))
      }
      confidenceValue.value = confidence
      toast.update('predict', {
        title: t('recognize_success') + ' ' + timeStr,
        color: 'success',
        duration: 1500
      })
      // 识别历史写入（/ocr 与 /write 共用收口）：成功 toast 之后、return 之前，
      // toast 响应优先；缩略图失败 makeThumb 返回 null、其余异常在此吞掉，
      // 历史写入失败不阻断识别（识别结果照常返回给页面）
      try {
        const engineName = cloudProvider ? providerDisplayName(cloudProvider) : t('history_engine_local')
        const thumb = await makeThumb(file)
        history.add({ latex: formatted, thumb, engine: engineName, source })
      } catch { /* 历史写入失败不阻断识别 */ }
      return formatted
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.update('predict', {
        title: t('recognize_failed') + ` ${message}`,
        color: 'error',
        duration: 0
      })
      throw err
    } finally {
      recognizing.value = false
    }
  }

  return { recognizing, confidenceValue, runOCR, loadModel, isReady, progress }
}
