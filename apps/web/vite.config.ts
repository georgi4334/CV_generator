import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { previewHeaders, securityHeaders } from './build/securityHeaders.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeaders(), previewHeaders()],
  resolve: {
    // `@/features/jobs/api` instead of long `../../..` paths.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // In development the API runs separately; proxy /api so the browser sees one origin.
    proxy: {
      // `vite preview` reuses this; end-to-end tests point it at their own API.
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
