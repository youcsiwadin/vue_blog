import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 后端地址：默认 http://localhost:8080，可通过 VITE_API_TARGET 覆盖
// 例如：VITE_API_TARGET=http://localhost:8081 npm run dev
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    port: 5173,
    proxy: {
      // 开发环境将 /api 请求代理到 Spring Boot 后端
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      // 通知 WebSocket：开发环境同样转发到 Spring Boot
      '/ws': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
      // 上传的图片同样代理到后端
      '/uploads': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
