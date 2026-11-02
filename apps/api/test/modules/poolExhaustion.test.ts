import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { createDb } from '../../src/db/client'
import { createLocalStorage } from '../../src/infra/storage/index'
import { dbAvailable, useTestApp } from '../support/context'
import { TEST_DATABASE_URL } from '../support/env'

const settled = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([
    promise.then((value) => ({ done: true as const, value })),
    new Promise<{ done: false }>((resolve) => setTimeout(() => resolve({ done: false }), ms)),
  ])

describe.skipIf(!dbAvailable)('database connection pool', () => {
  const ctx = useTestApp()

  /**
   * BUG (severe): PATCH /api/cvs/:id saves inside a transaction (which holds one pooled
   * connection and a lock on the CV row) and then calls pruneVersions with the pool `db`, which
   * needs a SECOND connection. The pool has 5 connections (db/client.ts): with 5 saves of the same
   * CV at the same time, the first one waits for a free connection while the other four hold all 5
   * and wait for its row lock: a deadlock the database cannot see. Every request that needs the
   * database then hangs (no timeout) until the process restarts; /api/health still answers
   * because it does not use the pool.
   * Reproduction: 5-6 parallel PATCH /api/cvs/:id { revision: 1, document } for one CV (two
   * browser tabs plus autosave retries are enough to get near it).
   * Expected: every request answers (200 or 409) within a few seconds.
   */
  it.fails(
    'answers parallel saves of the same CV instead of hanging',
    async () => {
      const database = createDb(`${TEST_DATABASE_URL}?application_name=pool-test`)
      const app = await buildApp({
        corsOrigin: 'http://localhost:5173',
        database,
        storage: createLocalStorage(mkdtempSync(join(tmpdir(), 'cv-pool-'))),
      })
      const created = await ctx.app.inject({
        method: 'POST',
        url: '/api/cvs',
        payload: {},
        headers: { cookie: ctx.cookie },
      })
      const cv = created.json()
      const saves = Array.from({ length: 6 }, () =>
        app.inject({
          method: 'PATCH',
          url: `/api/cvs/${cv.id}`,
          payload: { revision: 1, document: cv.document },
          headers: { cookie: ctx.cookie },
        }),
      )
      const all = Promise.allSettled(saves)
      try {
        const result = await settled(all, 4000)
        expect(result.done, 'all 6 parallel saves were answered within 4 s').toBe(true)
      } finally {
        // Cancel the waiting queries so the stuck connections are freed so the test run can end.
        await ctx.database.db.execute(
          sql`select pg_cancel_backend(pid) from pg_stat_activity where application_name = 'pool-test'`,
        )
        await settled(all, 5000)
        await settled(app.close(), 3000)
        await settled(database.close(), 3000)
      }
    },
    30_000,
  )
})
