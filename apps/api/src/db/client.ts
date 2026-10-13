import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export function createDb(url: string) {
  const client = postgres(url, { max: 5, connect_timeout: 5, onnotice: () => {} })
  const db = drizzle(client, { schema })

  return {
    db,
    async isHealthy() {
      try {
        await db.execute(sql`select 1`)
        return true
      } catch {
        return false
      }
    },
    close: () => client.end(),
  }
}

export type Database = ReturnType<typeof createDb>
