import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy only in local dev – NOT in production build
    proxy: mode === 'development' ? {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    } : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}))
