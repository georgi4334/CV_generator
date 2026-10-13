import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: true,
  // The shared package ships TypeScript source, so bundle it into the API build.
  noExternal: ['@cv/shared'],
})
