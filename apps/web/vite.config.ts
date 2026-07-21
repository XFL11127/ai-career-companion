import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../packages/shared'),
      '@ai-career-companion/types': resolve(__dirname, '../../packages/types'),
      '@ai-career-companion/utils': resolve(__dirname, '../../packages/utils')
    }
  }
})