import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/**
 * Passwords are hashed with scrypt (built into Node, no native add-on to
 * install). The cost follows OWASP's guidance (N=2^15, r=8, p=3: about 32 MiB
 * and a tenth of a second per hash). Each hash carries its own parameters,
 * so they can be raised later without locking anyone out.
 */
const PARAMS = { N: 2 ** 15, r: 8, p: 3 }
const KEY_LENGTH = 64
const SALT_LENGTH = 16

const derive = (password: string, salt: Buffer, params: { N: number; r: number; p: number }) =>
  new Promise<Buffer>((resolve, reject) => {
    const options: ScryptOptions = {
      ...params,
      // scrypt needs 128 * N * r bytes; allow a little more than that.
      maxmem: 128 * params.N * params.r * 2,
    }
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })

/** `scrypt$N$r$p$salt$hash` (salt and hash in base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await derive(password, salt, PARAMS)
  const { N, r, p } = PARAMS
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = await derive(password, Buffer.from(salt, 'base64'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

let dummyHash: Promise<string> | undefined

/**
 * Logging in with an unknown email still costs one hash, so the response time
 * does not reveal whether an account exists.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword('no account has this password')
  await verifyPassword(password, await dummyHash)
  return false
}
