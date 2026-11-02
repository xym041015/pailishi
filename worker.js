// Cloudflare Worker 入口：静态资产 + 模型文件同源代理
//
// 模型文件必须经本 Worker 从自有域名 /hf/* 转发到 hf-mirror：
// 浏览器跨站 fetch hf-mirror 会被其前置防护拦截（无 CORS 头），
// 而同源请求（snaplatex.cn/hf/*）没有 CORS 检查，服务器间转发也不受限。
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/hf/')) {
      const file = url.pathname.slice('/hf/'.length)
      const upstream = 'https://hf-mirror.com/' + file

      const headers = new Headers()
      // 透传 Range（transformers.js 断点续传）与协商缓存头
      for (const name of ['range', 'if-none-match', 'if-modified-since']) {
        const v = request.headers.get(name)
        if (v) headers.set(name, v)
      }

      const upstreamResp = await fetch(upstream, {
        method: request.method,
        headers,
        // cf 缓存：模型文件不可变，边缘缓存 7 天，后续访客近源取
        cf: { cacheEverything: true, cacheTtl: 604800 }
      })

      const respHeaders = new Headers(upstreamResp.headers)
      respHeaders.set('Access-Control-Allow-Origin', '*')
      respHeaders.set('Cache-Control', 'public, max-age=604800')
      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        statusText: upstreamResp.statusText,
        headers: respHeaders
      })
    }

    // 其余请求交给静态资产（含 not_found_handling 的 404 页）
    return env.ASSETS.fetch(request)
  }
}
