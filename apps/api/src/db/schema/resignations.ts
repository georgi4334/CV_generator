/** Resignation letters. */
import type { ResignationDocument } from '@cv/shared'
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { users } from './users'

export const resignations = pgTable(
  'resignations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** The whole letter (content + design), validated with ResignationDocumentSchema. */
    document: jsonb('document').$type<ResignationDocument>().notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('resignations_user_updated_idx').on(t.userId, t.updatedAt.desc())],
)
