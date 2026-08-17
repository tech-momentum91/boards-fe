import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:8000'
  const socketTarget =
    env.VITE_SOCKET_URL ??
    `http://localhost:${env.VITE_SOCKET_PORT ?? '9000'}`

  return {
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      buffer: 'buffer',
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: apiUrl, changeOrigin: true, secure: false },
      '/files': { target: apiUrl, changeOrigin: true, secure: false },
      '/private': { target: apiUrl, changeOrigin: true, secure: false },
      '/socket.io': {
        target: socketTarget,
        changeOrigin: false,
        ws: true,
        secure: false,
      },
    },
  },
  }
})
