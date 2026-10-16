import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { previewHeaders, securityHeaders } from './build/securityHeaders.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeaders(), previewHeaders()],
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
  },
})
