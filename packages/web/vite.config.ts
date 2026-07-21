import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    hmr: {
      enabled: true,
      overlay: true
    },
    watch: {
      usePolling: true
    }
  },
  cacheDir: './node_modules/.vite'
})