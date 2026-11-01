import type { ModelConfig } from './types'

/*
  模块 6：模型自托管——两个源都指向自己的 HF repo xzpdyy/pailishi-model。
  global = huggingface.co 直连（海外用户）；cn = hf-mirror.com 镜像（国内用户）。
  不再依赖 alephpi/FormulaNet（原作者删库不影响我们）。
*/
export const RemoteSource: Record<Region, ModelConfig> = {
  global: {
    modelName: 'xzpdyy/pailishi-model',
    env_config: {
      remoteHost: 'https://huggingface.co/',
      remotePathTemplate: '{model}/resolve/{revision}'
    },
    base: 'https://huggingface.co/xzpdyy/pailishi-model/resolve/main/'
  },
  cn: {
    modelName: 'xzpdyy/pailishi-model',
    env_config: {
      remoteHost: 'https://hf-mirror.com/',
      remotePathTemplate: '{model}/resolve/{revision}'
    },
    base: 'https://hf-mirror.com/xzpdyy/pailishi-model/resolve/main/'
  }
}

export const ModelList = ['config.json', 'generation_config.json', 'onnx/encoder_model.onnx', 'onnx/decoder_model_merged.onnx', 'tokenizer.json', 'tokenizer_config.json']
