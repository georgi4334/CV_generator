import type { CvDocument, JobStatus, JobType, Plan } from '@cv/shared'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  plan: text('plan').$type<Plan>().notNull().default('free'),
  createdAt: createdAt(),
})

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

/**
 * Public read-only links. One per CV (cover letters get their own column in
 * Step 13), so deleting a CV deletes its link.
 */
export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  cvId: uuid('cv_id')
    .notNull()
    .unique()
    .references(() => cvs.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

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
    /** Cover letters arrive in Step 13 (the foreign key comes with their table). */
    coverLetterId: uuid('cover_letter_id'),
    notes: text('notes').notNull().default(''),
    location: text('location').notNull().default(''),
    salary: text('salary').notNull().default(''),
    contact: text('contact').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('jobs_user_saved_idx').on(t.userId, t.dateSaved.desc())],
)
