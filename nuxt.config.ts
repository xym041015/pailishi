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

  routeRules: {
    '/': { redirect: { to: '/ocr', statusCode: 302 } }
  },

  compatibilityDate: '2025-01-15',
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
    strategy: 'no_prefix'
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
      globPatterns: ['**/*.{js,json,css,html,txt,svg,png,ico,webp,woff,woff2,ttf,eot,otf,wasm}'],
      maximumFileSizeToCacheInBytes: 25 * 1024 * 1024 // 25MB
      // 不添加 runtimeCaching，让 @huggingface/transformers 自己管理模型缓存
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
