// https://nuxt.com/docs/api/configuration/nuxt-config
import copyKatexFonts from './utils/copy-katex-font'
import mirrorPublicAssets from './utils/mirror-public-assets'
import replace from '@rollup/plugin-replace'
import { execSync } from 'child_process'
import { resolve } from 'path'

let nitroOutputDirs: { publicDir?: string, serverDir?: string } = {}

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@vite-pwa/nuxt'
  ],

  ssr: true,
  components: true,

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css', '~/assets/scss/katex.scss'],
  vue: {
    compilerOptions: {
      isCustomElement: tag => tag === 'math-field'
    }
  },

  /*
    关闭 @nuxt/ui 自动注册的 @nuxt/fonts：全站用系统字体栈 + KaTeX 本地字体，
    不需要任何网络字体；fonts.google.com 在目标网络不可达，其内部 fetch 会把
    CSS 转换打成 VITE_ERROR 500。
  */
  ui: {
    fonts: false
  },

  experimental: {
    // 关闭 app manifest：它会在运行时拉 /_nuxt/builds/meta/<构建ID>.json，
    // 纯静态站每次重新部署后，旧标签页要的是旧构建的元数据 → 404 → 整页报错。
    // 本站没有客户端 routeRules，也不需要过期构建检查，此机制纯属有害。
    appManifest: false
  },

  compatibilityDate: '2025-01-15',
  /*
    静态部署：显式列出全部预渲染路由（含 / 的 meta-refresh 重定向页），
    不依赖爬虫发现 —— CI 环境（如 Cloudflare Workers Builds）爬虫收敛过早
    会漏掉路由导致根 index.html 缺失。
  */
  nitro: {
    prerender: {
      routes: ['/', '/ocr', '/guide', '/comment', '/mathlive', '/404.html']
    }
  },
  vite: {
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          __COMMIT__: execSync('git rev-parse HEAD').toString().trim(),
          __BUILD_DATE__: new Date().toLocaleString()
        }
      })
    ]
  },
  hooks: {
    'ready': (nuxt) => {
      copyKatexFonts(nuxt.options.rootDir)
    },
    'nitro:build:public-assets': (nitro) => {
      // cloudflare-pages / cloudflare_module 预设下静态资产由 assets 目录服务，不需要镜像到 server chunks
      if (nitro?.options?.preset === 'cloudflare-pages' || nitro?.options?.preset === 'cloudflare_module') return
      const publicDir = nitro?.options?.output?.publicDir
      const serverDir = nitro?.options?.output?.serverDir
      nitroOutputDirs = { publicDir, serverDir }
      if (publicDir && serverDir) {
        mirrorPublicAssets(publicDir, resolve(serverDir))
      }
    },
    'build:done': () => {
      // cloudflare-pages / cloudflare_module 预设下跳过镜像
      if (process.env.NITRO_PRESET === 'cloudflare-pages' || process.env.NITRO_PRESET === 'cloudflare_module') return
      if (nitroOutputDirs.publicDir && nitroOutputDirs.serverDir) {
        mirrorPublicAssets(nitroOutputDirs.publicDir, resolve(nitroOutputDirs.serverDir))
        return
      }
      const outputDir = resolve(process.cwd(), '.output')
      mirrorPublicAssets(resolve(outputDir, 'public'), resolve(outputDir, 'server'))
    }
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  i18n: {
    locales: [
      { code: 'zh-CN', name: '中文', file: 'zh-CN.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    defaultLocale: 'zh-CN',
    langDir: 'locales',
    strategy: 'no_prefix',
    // 关闭浏览器语言探测：目标用户为中文，避免被浏览器语言（如英文系统）
    // 带偏成英文界面；英文只在用户手动切换时使用
    detectBrowserLanguage: false
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '拍立式 SnapLaTeX — 公式截图转可编辑公式',
      short_name: '拍立式',
      description: '拍下公式截图，识别成 LaTeX，粘贴到 Word 即为可编辑原生公式',
      theme_color: '#2B5C8F',
      background_color: '#f3f5f8',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      /*
        不缓存 html：HTML 每次从网络取最新版，保证引用的带指纹 JS/CSS 与
        当前部署一致。若缓存旧 HTML，重新部署后其引用的旧指纹 chunk 已被
        新构建替换（Workers assets 全量替换），请求 404 → 识别失败。
      */
      globPatterns: ['**/*.{js,json,css,txt,svg,png,ico,webp,woff,woff2,ttf,eot,otf,wasm}'],
      maximumFileSizeToCacheInBytes: 25 * 1024 * 1024, // 25MB
      runtimeCaching: [
        {
          // 语言包（_i18n/ 下内容寻址的 JSON）缓存优先：首次加载成功后走本地缓存，
          // 网络抖动也不会再把整站文案打回裸键名（i18n v10 语言包是运行时懒加载的）
          urlPattern: /\/_i18n\//,
          handler: 'CacheFirst',
          method: 'GET',
          options: {
            cacheName: 'i18n-messages',
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
          }
        }
      ]
      // 其余请求不添加 runtimeCaching，让 @huggingface/transformers 自己管理模型缓存
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 60 * 60 * 24 // per day
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  }
})
