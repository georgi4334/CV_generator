import { Readable } from 'node:stream'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { AwsClient } from 'aws4fetch'
import type { Storage } from './index'

interface R2Options {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  /** Defaults to Cloudflare R2's S3 endpoint for the account. */
  endpoint?: string
  fetch?: typeof fetch
}

/**
 * Uploaded images in Cloudflare R2 (any S3-compatible store works), signed
 * with AWS Signature V4. The bucket stays private: the API serves the files.
 */
export function createR2Storage(options: R2Options): Storage {
  const client = new AwsClient({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    service: 's3',
    region: 'auto',
  })
  const base = (
    options.endpoint ?? `https://${options.accountId}.r2.cloudflarestorage.com`
  ).replace(/\/$/, '')
  const doFetch = options.fetch ?? fetch
  const urlFor = (key: string) => {
    if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(key)) throw new Error(`Invalid storage key: ${key}`)
    return `${base}/${encodeURIComponent(options.bucket)}/${key}`
  }
  const send = async (key: string, init: RequestInit) => {
    const signed = await client.sign(urlFor(key), init)
    return doFetch(signed)
  }
  const fail = async (action: string, response: Response) =>
    new Error(`R2 ${action} failed: ${response.status} ${(await response.text()).slice(0, 200)}`)

  return {
    async put(key, data, contentType) {
      const response = await send(key, {
        method: 'PUT',
        body: data,
        headers: { 'content-type': contentType, 'content-length': String(data.length) },
      })
      if (!response.ok) throw await fail('upload', response)
    },
    async get(key) {
      const response = await send(key, { method: 'GET' })
      if (response.status === 404) return null
      if (!response.ok || !response.body) throw await fail('download', response)
      return Readable.fromWeb(response.body as WebReadableStream)
    },
    async remove(key) {
      const response = await send(key, { method: 'DELETE' })
      // Deleting a missing object is fine.
      if (!response.ok && response.status !== 404) throw await fail('delete', response)
    },
  }
}
