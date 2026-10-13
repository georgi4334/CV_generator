import postgres from 'postgres'
import type { TestProject } from 'vitest/node'
import { createDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://cv:cv@localhost:5432/cv_generator_test'

declare module 'vitest' {
  export interface ProvidedContext {
    dbAvailable: boolean
  }
}

/**
 * Creates the test database if needed and applies migrations. Without a
 * reachable Postgres the database tests are skipped locally, but CI sets
 * REQUIRE_DB_TESTS=1 so they can never be skipped there.
 */
export default async function setup(project: TestProject) {
  const url = new URL(TEST_DATABASE_URL)
  const name = url.pathname.slice(1)
  const admin = new URL(url)
  admin.pathname = '/postgres'

  const sql = postgres(admin.toString(), { max: 1, connect_timeout: 3, onnotice: () => {} })
  try {
    const [exists] = await sql`select 1 from pg_database where datname = ${name}`
    if (!exists) await sql.unsafe(`create database "${name}"`)

    const database = createDb(TEST_DATABASE_URL)
    await runMigrations(database)
    await database.close()
    project.provide('dbAvailable', true)
  } catch (error) {
    if (process.env.REQUIRE_DB_TESTS === '1') throw error
    console.warn(
      `\n⚠ Skipping database tests: cannot use ${url.host} (${(error as Error).message}).`,
    )
    console.warn('  Start Postgres with "pnpm db:up" to run them.\n')
    project.provide('dbAvailable', false)
  } finally {
    await sql.end({ timeout: 1 })
  }
}
