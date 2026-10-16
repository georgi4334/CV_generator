/** Accounts, sessions and one-time email links. */
import type { Locale, Plan } from '@cv/shared'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'

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
