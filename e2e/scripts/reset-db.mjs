// Recreates the end-to-end database, so every run starts empty. Runs before the API starts.
import { writeFileSync } from 'node:fs'
import postgres from 'postgres'

const url = new URL(process.env.DATABASE_URL)
const name = url.pathname.slice(1)
if (!/^[a-z0-9_]*e2e[a-z0-9_]*$/.test(name)) {
  throw new Error(`Refusing to reset "${name}": the end-to-end database name must contain "e2e"`)
}
// The emails of the previous run are gone too.
if (process.env.E2E_MAIL_FILE) writeFileSync(process.env.E2E_MAIL_FILE, '')
url.pathname = '/postgres'
const sql = postgres(url.toString(), { max: 1, onnotice: () => {} })
try {
  await sql.unsafe(`drop database if exists ${name} with (force)`)
  await sql.unsafe(`create database ${name}`)
} finally {
  await sql.end()
}
