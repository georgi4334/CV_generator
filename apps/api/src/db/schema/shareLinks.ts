/** Public read-only links to a CV or cover letter. */
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { coverLetters } from './coverLetters'
import { cvs } from './cvs'

/**
 * Public read-only links: one per document, deleted with it. Exactly one of
 * `cvId` and `coverLetterId` is set.
 */
export const shareLinks = pgTable(
  'share_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cvId: uuid('cv_id')
      .unique()
      .references(() => cvs.id, { onDelete: 'cascade' }),
    coverLetterId: uuid('cover_letter_id')
      .unique()
      .references((): AnyPgColumn => coverLetters.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('share_links_one_document', sql`(${t.cvId} is null) <> (${t.coverLetterId} is null)`),
  ],
)
