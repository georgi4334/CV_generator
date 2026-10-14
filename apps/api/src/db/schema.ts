import type { CvDocument, Plan } from '@cv/shared'
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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
    /** Saved job this CV was tailored for (jobs table arrives in Step 12). */
    jobId: uuid('job_id'),
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
