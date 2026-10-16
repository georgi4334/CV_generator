/** Uploaded images (the files live in storage). */
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { users } from './users'

export const uploads = pgTable('uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Key in the storage backend (a file name on local disk, an object key in S3/R2). */
  storageKey: text('storage_key').notNull().unique(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  createdAt: createdAt(),
})
