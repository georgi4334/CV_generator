/** AI requests per user and day. */
import { date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

/** AI requests per user and day (UTC), for the plan's daily limit. */
export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
)
