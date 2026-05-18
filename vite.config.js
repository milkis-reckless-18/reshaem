import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/api/tts': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: () => '/v1/audio/speech',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', 'Bearer ' + env.VITE_OPENAI_API_KEY)
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          },
        },
      },
    },
  }
})