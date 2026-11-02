import { Readable } from 'node:stream'
import type { Storage } from '../../src/infra/storage/index'

/** Storage in memory; `fail` makes chosen operations throw, like an offline bucket. */
export function createMemoryStorage() {
  const files = new Map<string, { data: Buffer; contentType: string }>()
  const fail = { put: false, get: false, remove: false }
  const storage: Storage = {
    async put(key, data, contentType) {
      if (fail.put) throw new Error('bucket offline: secret-endpoint.example')
      files.set(key, { data, contentType })
    },
    async get(key) {
      if (fail.get) throw new Error('bucket offline: secret-endpoint.example')
      const file = files.get(key)
      return file ? Readable.from([file.data]) : null
    },
    async remove(key) {
      if (fail.remove) throw new Error('bucket offline: secret-endpoint.example')
      files.delete(key)
    },
  }
  return { storage, files, fail }
}
