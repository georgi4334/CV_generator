import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Where the API writes the emails it would send during browser tests (JSON lines). */
export const MAIL_FILE = join(tmpdir(), 'cv-e2e-mail.jsonl')
