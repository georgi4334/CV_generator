import type { CoverLetterDocument, CvDocument, JobStatus, JobType, Locale, Plan } from '@cv/shared'
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
  check,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Always lower case (see normalizeEmail). */
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  plan: text('plan').$type<Plan>().notNull().default('free'),
  /** scrypt hash; null for accounts that cannot log in with a password. */
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  /** Interface language; account emails are written in it. */
  locale: text('locale').$type<Locale>().notNull().default('en'),
  createdAt: createdAt(),
})

/** Logged-in browsers. Only a hash of the cookie's token is stored, so a leaked table is useless. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

export type AuthTokenPurpose = 'password_reset' | 'email_verification'

/** One-time links sent by email. Like sessions, only the token's hash is stored. */
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').$type<AuthTokenPurpose>().notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId, t.purpose)],
)

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
