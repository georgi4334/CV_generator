/** CVs and their saved versions. */
import type { CvDocument } from '@cv/shared'
import {
  boolean,
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
import { jobs } from './jobs'
import { users } from './users'

export const cvs = pgTable(
  'cvs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    professionId: text('profession_id'),
    /** Saved job this CV was tailored for; cleared when the job is deleted. */
    jobId: uuid('job_id').references((): AnyPgColumn => jobs.id, { onDelete: 'set null' }),
    /** The whole CV (content + design), validated with CvDocumentSchema. */
    document: jsonb('document').$type<CvDocument>().notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('cvs_user_updated_idx').on(t.userId, t.updatedAt.desc())],
)

export const cvVersions = pgTable(
  'cv_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cvId: uuid('cv_id')
      .notNull()
      .references(() => cvs.id, { onDelete: 'cascade' }),
    document: jsonb('document').$type<CvDocument>().notNull(),
    label: text('label'),
    auto: boolean('auto').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index('cv_versions_cv_created_idx').on(t.cvId, t.createdAt.desc())],
)
