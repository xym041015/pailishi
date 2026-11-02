import { RemoteSource, ModelList } from './constants'

export type Region = 'cn' | 'global'

const PROBE_TIMEOUT_MS = 5000

// 目标用户以国内为主：cn（hf-mirror）优先探测。两个源都加 5 秒超时，
// 避免被墙的 huggingface.co 在 TCP 层挂 40-75 秒才回退，拖死首次识别。
async function probe(base: string): Promise<boolean> {
  try {
    const response = await fetch(base + ModelList[0], {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
    })
    return response.ok
  } catch {
    return false
  }
}

export const useSource = async () => {
  const model_config = await checkCache()
  if (model_config) {
    console.log('model cached, no need to load from remote')
    return model_config
  }

  for (const region of ['cn', 'global'] as const) {
    const config = RemoteSource[region]
    if (await probe(config.base!)) {
      console.log(`model loading source set to ${region}`)
      return config
    }
  }

  throw new Error('没有可用的模型源（huggingface 与镜像均不可达），请检查网络后重试')
}
