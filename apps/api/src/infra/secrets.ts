import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Encrypts small secrets (a person's API key) before they go into the database, so a leaked
 * database or backup does not leak working keys. AES-256-GCM: the text is unreadable and any
 * change to it is detected. The result is `v1.<iv>.<tag>.<ciphertext>`, each part base64url.
 */
export interface SecretBox {
  encrypt: (plain: string) => string
  /** null when the text was not made with this key (e.g. SECRETS_KEY was changed). */
  decrypt: (sealed: string) => string | null
}

export function createSecretBox(secret: string): SecretBox {
  const key = createHash('sha256').update(secret).digest()
  return {
    encrypt(plain) {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
      return ['v1', iv, cipher.getAuthTag(), data]
        .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
        .join('.')
    },
    decrypt(sealed) {
      const [version, iv, tag, data] = sealed.split('.')
      if (version !== 'v1' || !iv || !tag || !data) return null
      try {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
        decipher.setAuthTag(Buffer.from(tag, 'base64url'))
        return Buffer.concat([
          decipher.update(Buffer.from(data, 'base64url')),
          decipher.final(),
        ]).toString('utf8')
      } catch {
        return null
      }
    },
  }
}
