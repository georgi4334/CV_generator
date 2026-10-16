/** Cover letters. */
import type { CoverLetterDocument } from '@cv/shared'
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { cvs } from './cvs'
import { jobs } from './jobs'
import { users } from './users'

export const coverLetters = pgTable(
  'cover_letters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** The CV it goes with; cleared when that CV is deleted. */
    cvId: uuid('cv_id').references((): AnyPgColumn => cvs.id, { onDelete: 'set null' }),
    /** Saved job it was written for; cleared when the job is deleted. */
    jobId: uuid('job_id').references((): AnyPgColumn => jobs.id, { onDelete: 'set null' }),
    /** The whole letter (content + design), validated with CoverLetterDocumentSchema. */
    document: jsonb('document').$type<CoverLetterDocument>().notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('cover_letters_user_updated_idx').on(t.userId, t.updatedAt.desc())],
)
