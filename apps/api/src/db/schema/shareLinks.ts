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
import { resignations } from './resignations'

/**
 * Public read-only links: one per document, deleted with it. Exactly one of
 * `cvId`, `coverLetterId` and `resignationId` is set.
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
    resignationId: uuid('resignation_id')
      .unique()
      .references((): AnyPgColumn => resignations.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    isActive: boolean('is_active').notNull().default(true),
    /** Show stand-ins for the name, photo and contact details (sharing for public feedback). */
    hidePersonal: boolean('hide_personal').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'share_links_one_document',
      sql`(${t.cvId} is not null)::int + (${t.coverLetterId} is not null)::int + (${t.resignationId} is not null)::int = 1`,
    ),
  ],
)
