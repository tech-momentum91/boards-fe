import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

function resolveVendorChunk(id: string) {
  if (id.includes('@tiptap') || id.includes('prosemirror')) {
    return 'editor'
  }

  if (id.includes('@dnd-kit')) {
    return 'dnd-kit'
  }

  if (id.includes('@radix-ui')) {
    return 'radix-ui'
  }

  if (id.includes('date-fns') || id.includes('/moment/')) {
    return 'dates'
  }

  if (id.includes('lodash')) {
    return 'lodash'
  }

  if (id.includes('emoji-picker-react')) {
    return 'emoji-picker'
  }

  if (id.includes('socket.io-client')) {
    return 'socket'
  }

  if (
    id.includes('/react-dom/') ||
    id.includes('/react-router') ||
    id.includes('/react-redux/') ||
    id.includes('/@reduxjs/')
  ) {
    return 'react-vendor'
  }

  return 'vendor'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL ?? 'http://boards.local:4000'
  const socketTarget =
    env.VITE_SOCKET_URL ??
    `http://boards.local:${env.VITE_SOCKET_PORT ?? '9000'}`

  return {
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        buffer: 'buffer',
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return resolveVendorChunk(id)
            }

            return undefined
          },
        },
      },
    },
    server: {
      port: 5164,
      strictPort: true,
      host: true,
      allowedHosts: ['localhost', 'boards.local'],
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
