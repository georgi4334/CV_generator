import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLocalStorage, type Storage } from './index'

async function read(stream: NodeJS.ReadableStream | null) {
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

describe('local storage', () => {
  let dir: string
  let storage: Storage
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cv-storage-'))
    storage = createLocalStorage(join(dir, 'nested', 'uploads'))
  })
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it('creates the folder on first write and reads the bytes back unchanged', async () => {
    const bytes = Buffer.from([0, 255, 1, 2, 0, 3])
    await storage.put('a1.png', bytes, 'image/png')
    expect(await read(await storage.get('a1.png'))).toEqual(bytes)
  })

  it('replaces a file written twice under the same key', async () => {
    await storage.put('a1.png', Buffer.from('one'), 'image/png')
    await storage.put('a1.png', Buffer.from('two'), 'image/png')
    expect((await read(await storage.get('a1.png'))).toString()).toBe('two')
  })

  it('answers null for a file that was never stored (also before the folder exists)', async () => {
    expect(await storage.get('missing.png')).toBeNull()
    await storage.put('a1.png', Buffer.from('x'), 'image/png')
    expect(await storage.get('missing.png')).toBeNull()
  })

  it('stores an empty file', async () => {
    await storage.put('empty.png', Buffer.alloc(0), 'image/png')
    expect((await read(await storage.get('empty.png'))).length).toBe(0)
  })

  it('removes a file, and removing it again or a missing one is not an error', async () => {
    await storage.put('a1.png', Buffer.from('x'), 'image/png')
    await storage.remove('a1.png')
    expect(await storage.get('a1.png')).toBeNull()
    await expect(storage.remove('a1.png')).resolves.toBeUndefined()
    await expect(storage.remove('never.png')).resolves.toBeUndefined()
  })

  it.each([
    '../secret.png',
    '..%2Fsecret.png',
    'a/b.png',
    'a\\b.png',
    '/etc/passwd',
    '.hidden',
    'noextension',
    'a.png/../../x.png',
    'a b.png',
    'a.png\u0000.txt',
    'a..png',
    'a.tar.gz',
    '',
    '🙂.png',
  ])('refuses the key %j in every operation', async (key) => {
    await expect(storage.put(key, Buffer.from('x'), 'image/png')).rejects.toThrow(
      /Invalid storage key/,
    )
    await expect(storage.get(key)).rejects.toThrow(/Invalid storage key/)
    await expect(storage.remove(key)).rejects.toThrow(/Invalid storage key/)
  })

  it('never writes outside its folder', async () => {
    await storage.put('ok.png', Buffer.from('x'), 'image/png')
    await storage.put('x.png', Buffer.from('x'), 'image/png').catch(() => {})
    await storage.put('../escape.png', Buffer.from('x'), 'image/png').catch(() => {})
    expect(await readdir(join(dir, 'nested'))).toEqual(['uploads'])
    expect((await readdir(join(dir, 'nested', 'uploads'))).sort()).toEqual(['ok.png', 'x.png'])
  })

  it('keeps files that already exist in the folder when it is created again', async () => {
    await storage.put('a1.png', Buffer.from('keep'), 'image/png')
    const again = createLocalStorage(join(dir, 'nested', 'uploads'))
    expect((await read(await again.get('a1.png'))).toString()).toBe('keep')
    await writeFile(join(dir, 'nested', 'uploads', 'b2.png'), 'direct')
    expect((await readFile(join(dir, 'nested', 'uploads', 'b2.png'))).toString()).toBe('direct')
  })

  it('handles many files written at the same time', async () => {
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        storage.put(`f${i}.png`, Buffer.from(`n${i}`), 'image/png'),
      ),
    )
    expect((await read(await storage.get('f49.png'))).toString()).toBe('n49')
    expect(await readdir(join(dir, 'nested', 'uploads'))).toHaveLength(50)
  })
})
