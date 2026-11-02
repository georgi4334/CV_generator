// The cover letter and resignation sessions (autosave wiring), same rules as the CV session.
import '@/test/appHarness'
import '@/features/auth/api'
import '@/features/cv-editor/api'
import '@/features/jobs/api'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSaveState } from '@/features/cv-editor/state/editorSession'
import { useResignationEditor } from '@/features/resignation/state/resignationEditorStore'
import {
  flushResignationSave,
  loadResignationIntoEditor,
  overwriteResignationServerCopy,
  useResignationSession,
} from '@/features/resignation/state/resignationSession'
import { ApiRequestError } from '@/shared/api/client'
import { fake } from '@/test/fakeHolders'
import { useLetterEditor } from './letterEditorStore'
import {
  flushLetterSave,
  loadLetterIntoEditor,
  overwriteLetterServerCopy,
  useLetterSession,
} from './letterSession'

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const status = () => useSaveState.getState().status

interface Kit {
  name: string
  create: () => Promise<{ id: string; revision: number }>
  Session: (props: { record: never }) => null
  edit: (text: string) => void
  read: (id: string) => string
  flush: () => Promise<boolean>
  overwrite: (revision: number) => void
  load: (record: never) => void
  get: (id: string) => Promise<unknown>
  currentText: () => string
}

const kits: Kit[] = [
  {
    name: 'cover letter',
    create: () => fake.current.coverLetterApi.create({ title: 'Letter' }),
    Session: ({ record }) => {
      useLetterSession(record)
      return null
    },
    edit: (text) => act(() => useLetterEditor.getState().setField('greeting', text)),
    read: (id) => fake.current.letters.get(id)!.document.greeting,
    flush: flushLetterSave,
    overwrite: overwriteLetterServerCopy,
    load: loadLetterIntoEditor as never,
    get: (id) => fake.current.coverLetterApi.get(id),
    currentText: () => useLetterEditor.getState().letter!.greeting,
  },
  {
    name: 'resignation letter',
    create: () => fake.current.resignationApi.create({ title: 'Resignation' }),
    Session: ({ record }) => {
      useResignationSession(record)
      return null
    },
    edit: (text) => act(() => useResignationEditor.getState().setField('sender.name', text)),
    read: (id) => fake.current.resignations.get(id)!.document.sender.name,
    flush: flushResignationSave,
    overwrite: overwriteResignationServerCopy,
    load: loadResignationIntoEditor as never,
    get: (id) => fake.current.resignationApi.get(id),
    currentText: () => useResignationEditor.getState().letter!.sender.name,
  },
]

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe.each(kits.map((kit) => [kit.name, kit] as const))('%s session', (_, kit) => {
  const api = () =>
    (kit.name === 'cover letter'
      ? fake.current.coverLetterApi
      : fake.current.resignationApi) as unknown as {
      update: (id: string, input: unknown) => Promise<unknown>
    }
  let originalUpdate: (id: string, input: unknown) => Promise<unknown>

  const mount = async () => {
    const record = await kit.create()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(
      <QueryClientProvider client={queryClient}>
        <kit.Session record={(await kit.get(record.id)) as never} />
      </QueryClientProvider>,
    )
    return { record, ...view }
  }

  beforeEach(() => {
    originalUpdate ??= api().update.bind(api())
    api().update = originalUpdate
  })

  it('saves many quick edits as one request', async () => {
    const update = vi.spyOn(api(), 'update')
    const { record } = await mount()
    for (let i = 0; i < 30; i++) {
      kit.edit(`text ${i}`)
      await tick(30)
    }
    await tick(1000)
    expect(update).toHaveBeenCalledTimes(1)
    expect(kit.read(record.id)).toBe('text 29')
    expect(status()).toBe('saved')
  })

  it('keeps the text, shows an error and saves after the network is back', async () => {
    let offline = true
    api().update = async (id, input) => {
      if (offline) throw new ApiRequestError(null, 'network_error', 'offline')
      return originalUpdate(id, input)
    }
    const { record } = await mount()
    kit.edit('written offline')
    await tick(1000)
    expect(status()).toBe('error')
    expect(kit.currentText()).toBe('written offline')
    offline = false
    await tick(2000)
    expect(status()).toBe('saved')
    expect(kit.read(record.id)).toBe('written offline')
  })

  it('saves at once when the editor is closed with unsaved text', async () => {
    const { record, unmount } = await mount()
    kit.edit('last words')
    unmount()
    await tick(0)
    expect(kit.read(record.id)).toBe('last words')
  })

  it('asks before the tab is closed only with unsaved changes', async () => {
    await mount()
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)
    kit.edit('unsaved')
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
    await tick(0)
  })

  it('goes into conflict when saved elsewhere, then "keep mine" overwrites and "load" resets', async () => {
    const { record } = await mount()
    const server = (await kit.get(record.id)) as { document: unknown }
    await originalUpdate(record.id, { revision: record.revision, document: server.document })
    kit.edit('mine')
    await tick(1000)
    expect(status()).toBe('conflict')
    const revision = (useSaveState.getState().error?.details as { revision: number }).revision
    act(() => kit.overwrite(revision))
    await tick(100)
    expect(status()).toBe('saved')
    expect(kit.read(record.id)).toBe('mine')

    const latest = await kit.get(record.id)
    act(() => kit.load(latest as never))
    expect(status()).toBe('saved')
  })

  it('flush reports false when the server is unreachable', async () => {
    api().update = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    await mount()
    kit.edit('x')
    const result = act(() => kit.flush())
    await tick(0)
    expect(await result).toBe(false)
  })

  it('flush with nothing open or nothing changed is true', async () => {
    expect(await kit.flush()).toBe(true)
    await mount()
    expect(await kit.flush()).toBe(true)
  })
})
