import { describe, expect, it } from 'vitest'
import { DEV_SECRETS_KEY, type Env } from './env'
import { productionProblems, productionWarnings } from './production'

const complete = {
  NODE_ENV: 'production',
  STORAGE: 'r2',
  R2_ACCOUNT_ID: 'a',
  R2_ACCESS_KEY_ID: 'b',
  R2_SECRET_ACCESS_KEY: 'c',
  R2_BUCKET: 'd',
  BREVO_API_KEY: 'k',
  MAIL_FROM: 'me@example.com',
  APP_URL: 'https://cv.example.com',
  CORS_ORIGIN: 'https://cv.example.com',
  PROXY_SECRET: 'p'.repeat(32),
  SECRETS_KEY: 's'.repeat(32),
  SENTRY_DSN: 'https://dsn',
  GEMINI_API_KEY: 'g',
  E2E_MAIL_FILE: '',
  AUTH_LIMIT_SCALE: 1,
} as unknown as Env
const withEnv = (change: Record<string, unknown>) => ({ ...complete, ...change }) as unknown as Env

describe('productionProblems, one problem at a time', () => {
  it('has no problem in a complete setup', () => {
    expect(productionProblems(complete)).toEqual([])
  })

  it.each([
    ['local storage', { STORAGE: 'local' }, 'STORAGE must be r2 (the server disk is not kept)'],
    ['no R2 account', { R2_ACCOUNT_ID: '' }, 'R2 storage needs R2_ACCOUNT_ID'],
    ['no R2 key id', { R2_ACCESS_KEY_ID: '' }, 'R2 storage needs R2_ACCESS_KEY_ID'],
    ['no R2 secret', { R2_SECRET_ACCESS_KEY: '' }, 'R2 storage needs R2_SECRET_ACCESS_KEY'],
    ['no R2 bucket', { R2_BUCKET: '' }, 'R2 storage needs R2_BUCKET'],
    [
      'all R2 settings missing',
      { R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '', R2_BUCKET: '' },
      'R2 storage needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET',
    ],
    [
      'the browser-test mail file',
      { E2E_MAIL_FILE: '/tmp/m' },
      'E2E_MAIL_FILE is for browser tests only',
    ],
    ['a raised auth limit', { AUTH_LIMIT_SCALE: 2 }, 'AUTH_LIMIT_SCALE is for browser tests only'],
    ['no Brevo key', { BREVO_API_KEY: '' }, 'Emails need BREVO_API_KEY'],
    ['no sender', { MAIL_FROM: '' }, 'Emails need MAIL_FROM'],
    [
      'no email settings at all',
      { BREVO_API_KEY: '', MAIL_FROM: '' },
      'Emails need BREVO_API_KEY, MAIL_FROM',
    ],
    [
      'localhost app url',
      { APP_URL: 'http://localhost:5173' },
      'APP_URL must be the public web address',
    ],
    [
      'localhost cors origin',
      { CORS_ORIGIN: 'https://cv.example.com,http://localhost:5173' },
      'CORS_ORIGIN must be the public web address',
    ],
    [
      'a short proxy secret',
      { PROXY_SECRET: 'p'.repeat(31) },
      'PROXY_SECRET must be at least 32 characters',
    ],
    [
      'the development secrets key',
      { SECRETS_KEY: DEV_SECRETS_KEY },
      'SECRETS_KEY must be a random value of at least 32 characters',
    ],
    [
      'a short secrets key',
      { SECRETS_KEY: 's'.repeat(31) },
      'SECRETS_KEY must be a random value of at least 32 characters',
    ],
    [
      'an empty secrets key',
      { SECRETS_KEY: '' },
      'SECRETS_KEY must be a random value of at least 32 characters',
    ],
  ])('reports %s', (_name, change, message) => {
    expect(productionProblems(withEnv(change))).toEqual([message])
  })

  it('does not report R2 settings when storage is local (only the storage problem)', () => {
    expect(productionProblems(withEnv({ STORAGE: 'local', R2_BUCKET: '' }))).toEqual([
      'STORAGE must be r2 (the server disk is not kept)',
    ])
  })

  it('accepts an unset proxy secret (it is only a warning) and exactly 32 characters', () => {
    expect(productionProblems(withEnv({ PROXY_SECRET: '' }))).toEqual([])
    expect(productionProblems(withEnv({ PROXY_SECRET: 'p'.repeat(32) }))).toEqual([])
  })

  it('accepts AUTH_LIMIT_SCALE of exactly 1', () => {
    expect(productionProblems(withEnv({ AUTH_LIMIT_SCALE: 1 }))).toEqual([])
  })

  it('lists every problem of a completely unconfigured production', () => {
    const env = withEnv({
      STORAGE: 'local',
      BREVO_API_KEY: '',
      MAIL_FROM: '',
      APP_URL: 'http://localhost:5173',
      CORS_ORIGIN: 'http://localhost:5173',
      PROXY_SECRET: 'short',
      SECRETS_KEY: DEV_SECRETS_KEY,
      E2E_MAIL_FILE: 'x',
      AUTH_LIMIT_SCALE: 50,
    })
    expect(productionProblems(env)).toHaveLength(8)
  })

  it.each(['development', 'test'])('checks nothing when NODE_ENV is %s', (NODE_ENV) => {
    expect(
      productionProblems(
        withEnv({ NODE_ENV, STORAGE: 'local', SECRETS_KEY: '', APP_URL: 'http://localhost' }),
      ),
    ).toEqual([])
    expect(productionWarnings(withEnv({ NODE_ENV, PROXY_SECRET: '', SENTRY_DSN: '' }))).toEqual([])
  })
})

describe('productionWarnings, one at a time', () => {
  it('has no warning in a complete setup', () => {
    expect(productionWarnings(complete)).toEqual([])
  })

  it.each([
    ['PROXY_SECRET', { PROXY_SECRET: '' }, 'PROXY_SECRET is not set'],
    ['SENTRY_DSN', { SENTRY_DSN: '' }, 'SENTRY_DSN is not set'],
    ['GEMINI_API_KEY', { GEMINI_API_KEY: '' }, 'GEMINI_API_KEY is not set'],
  ])('warns about a missing %s', (_name, change, start) => {
    const warnings = productionWarnings(withEnv(change))
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain(start)
  })

  it('warns about all three when none is set', () => {
    expect(
      productionWarnings(withEnv({ PROXY_SECRET: '', SENTRY_DSN: '', GEMINI_API_KEY: '' })),
    ).toHaveLength(3)
  })
})
