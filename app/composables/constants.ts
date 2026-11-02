import type { ModelConfig } from './types'

/*
  模型源配置：
  - cn：走自有域名 /hf/* 同源代理（worker.js 转发到 hf-mirror）。浏览器跨站
    fetch hf-mirror 会被其前置防护拦截（无 CORS 头）导致识别失败，同源代理
    是国内用户的可靠路径；Cloudflare 边缘还会缓存模型文件加速后续访客。
  - global：海外用户直连 huggingface.co（官方 API 自带 ACAO:*）。
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
      remoteHost: 'https://snaplatex.cn/',
      remotePathTemplate: 'hf/{model}/resolve/{revision}'
    },
    base: 'https://snaplatex.cn/hf/xzpdyy/pailishi-model/resolve/main/'
  }
}

export const ModelList = ['config.json', 'generation_config.json', 'onnx/encoder_model.onnx', 'onnx/decoder_model_merged.onnx', 'tokenizer.json', 'tokenizer_config.json']
