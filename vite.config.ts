import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('lottie-react') || id.includes('react-confetti')) {
            return 'animation-vendor'
          }

          if (id.includes('@rails/actioncable')) {
            return 'realtime-vendor'
          }

          if (
            id.includes('react-router-dom') ||
            id.includes('/react/') ||
            id.includes('/react-dom/')
          ) {
            return 'react-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/cable': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
