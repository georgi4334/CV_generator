import { timestamp } from 'drizzle-orm/pg-core'

/** Creation time, set by the database. */
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
