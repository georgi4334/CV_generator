import { createHash, randomBytes } from 'node:crypto'

/** A new secret for a cookie or an email link: 256 random bits, URL-safe. */
export const newToken = () => randomBytes(32).toString('base64url')

/** What the database stores instead of the secret itself. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
