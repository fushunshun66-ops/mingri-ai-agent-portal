/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    globals: true,
    css: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      exclude: ['src/main.ts', 'src/router/**', 'src/types/**'],
      thresholds: {
        statements: 80,
        lines: 80,
      },
    },
  },
})
