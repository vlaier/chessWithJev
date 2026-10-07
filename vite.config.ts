/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { jevProxyPlugin } from './vite-plugins/jevProxy.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), jevProxyPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
