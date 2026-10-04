import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const proxy = {
  '/api': { target: 'https://api.kaetram.com', changeOrigin: true, secure: true }
}

export default defineConfig({
  plugins: [vue()],
  server: { proxy },
  preview: { proxy }
})
