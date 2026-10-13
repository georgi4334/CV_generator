import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, inject } from 'vitest'
import { buildApp } from '../src/app'
import { createDb, type Database } from '../src/db/client'
import { createLocalStorage } from '../src/lib/storage'

export const dbAvailable = inject('dbAvailable')

/** A real app on the test database, emptied before every test. */
export function useTestApp() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://cv:cv@localhost:5432/cv_generator_test'
  const context = {} as { app: Awaited<ReturnType<typeof buildApp>>; database: Database }

  beforeEach(async () => {
    if (!context.database) {
      context.database = createDb(url)
      context.app = await buildApp({
        corsOrigin: 'http://localhost:5173',
        database: context.database,
        storage: createLocalStorage(mkdtempSync(join(tmpdir(), 'cv-uploads-'))),
      })
    }
    await context.database.db.execute(sql`truncate users, cvs, cv_versions, uploads cascade`)
  })

  afterAll(async () => {
    await context.app?.close()
    await context.database?.close()
  })

  return context
}
