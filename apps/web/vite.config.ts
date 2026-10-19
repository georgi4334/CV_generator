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
    // Route-level tests render the whole app; with coverage on a shared CI runner the slowest take
    // 5 to 6 seconds, right at Vitest's default limit (2 to 3 seconds on a laptop).
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
