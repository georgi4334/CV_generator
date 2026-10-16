/** Saved Jobs. */
import type { JobStatus, JobType } from '@cv/shared'
import { date, index, pgTable, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { coverLetters } from './coverLetters'
import { cvs } from './cvs'
import { users } from './users'

/** Saved Jobs: where the user applied and which CV they sent. */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    company: text('company').notNull(),
    status: text('status').$type<JobStatus>().notNull().default('to_apply'),
    type: text('type').$type<JobType>(),
    dateSaved: date('date_saved', { mode: 'string' }).notNull(),
    dateApplied: date('date_applied', { mode: 'string' }),
    /** Cleared when that CV is deleted. */
    cvId: uuid('cv_id').references((): AnyPgColumn => cvs.id, { onDelete: 'set null' }),
    /** Cleared when that cover letter is deleted. */
    coverLetterId: uuid('cover_letter_id').references((): AnyPgColumn => coverLetters.id, {
      onDelete: 'set null',
    }),
    notes: text('notes').notNull().default(''),
    location: text('location').notNull().default(''),
    salary: text('salary').notNull().default(''),
    contact: text('contact').notNull().default(''),
    /** The job posting text (Check & Tailor, letter drafts). */
    description: text('description').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('jobs_user_saved_idx').on(t.userId, t.dateSaved.desc())],
)
