import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./test/globalSetup.ts'],
    // Test files share one database, so they run one after another.
    fileParallelism: false,
    // Password hashing is slow on purpose; a busy machine (CI, other tests) needs more than 5 s.
    testTimeout: 20_000,
  },
})
