// The CV session (autosave wiring) with the fake API and fake timers.
import '@/test/appHarness'
// The harness creates its fakes when the mocked API modules are first loaded.
import '@/features/auth/api'
import '@/features/cover-letters/api'
import '@/features/jobs/api'
import '@/features/resignation/api'
import type { CvRecord } from '@cv/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import { fake } from '@/test/fakeHolders'
import { useCvEditor } from './cvEditorStore'
import {
  flushSave,
  loadIntoEditor,
  overwriteServerCopy,
  useSaveState,
  useCvSession,
} from './editorSession'

function Session({ record }: { record: CvRecord }) {
  useCvSession(record)
  return null
}

function mount(record: CvRecord) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (child: ReactNode) => (
    <QueryClientProvider client={queryClient}>{child}</QueryClientProvider>
  )
  const view = render(wrap(<Session record={record} />))
  return { ...view, queryClient }
}

let originalUpdate: typeof fake.current.api.update
const status = () => useSaveState.getState().status
const type = (name: string) => act(() => useCvEditor.getState().setField('header.name', name))
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

beforeEach(() => {
  vi.useFakeTimers()
  originalUpdate ??= fake.current.api.update
  fake.current.api.update = originalUpdate
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useCvSession', () => {
  it('loads the record into the editor with a clean history and "saved" state', () => {
    const record = fake.current.seed('CV')
    mount(record)
    expect(useCvEditor.getState().docId).toBe(record.id)
    expect(useCvEditor.getState().cv).toEqual(record.document)
    expect(useCvEditor.getState().past).toHaveLength(0)
    expect(status()).toBe('saved')
  })

  it('saves 50 quick edits as one request with the newest text', async () => {
    const record = fake.current.seed('CV')
    const update = vi.spyOn(fake.current.api, 'update')
    mount(record)
    for (let i = 0; i < 50; i++) {
      type(`Name ${i}`)
      await tick(20)
    }
    expect(status()).toBe('pending')
    await tick(1000)
    expect(update).toHaveBeenCalledTimes(1)
    expect(fake.current.cvs.get(record.id)!.document.header.name).toBe('Name 49')
    expect(status()).toBe('saved')
  })

  it('shows an error, keeps the edits and saves them when the network comes back', async () => {
    const record = fake.current.seed('CV')
    let offline = true
    fake.current.api.update = async (id, input) => {
      if (offline) throw new ApiRequestError(null, 'network_error', 'offline')
      return originalUpdate(id, input)
    }
    mount(record)
    type('Written offline')
    await tick(1000)
    expect(status()).toBe('error')
    expect(useSaveState.getState().error?.code).toBe('network_error')
    expect(useCvEditor.getState().cv!.header.name).toBe('Written offline')
    offline = false
    await tick(2000)
    expect(status()).toBe('saved')
    expect(fake.current.cvs.get(record.id)!.document.header.name).toBe('Written offline')
  })

  it('keeps retrying with growing waits while the server is down, without piling up requests', async () => {
    const record = fake.current.seed('CV')
    const update = vi.fn(async () => {
      throw new ApiRequestError(503, 'http_error', 'down')
    })
    fake.current.api.update = update
    mount(record)
    type('Hello')
    await tick(1000)
    await tick(10 * 60_000)
    // 1 + retries at 2 s, 5 s, 10 s, then every 30 s for ten minutes: bounded, not a flood.
    expect(update.mock.calls.length).toBeGreaterThan(5)
    expect(update.mock.calls.length).toBeLessThan(40)
    expect(status()).toBe('error')
  })

  it('saves pending edits at once when the editor is closed', async () => {
    const record = fake.current.seed('CV')
    const { unmount } = mount(record)
    type('Unsaved when leaving')
    expect(status()).toBe('pending')
    unmount()
    await tick(0)
    expect(fake.current.cvs.get(record.id)!.document.header.name).toBe('Unsaved when leaving')
  })

  it('closing the editor while offline does not throw or leave a timer behind', async () => {
    const record = fake.current.seed('CV')
    fake.current.api.update = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    const { unmount } = mount(record)
    type('Lost?')
    unmount()
    await tick(60_000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('asks the browser to confirm closing the tab only while there are unsaved changes', async () => {
    const record = fake.current.seed('CV')
    mount(record)
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    type('Typing')
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
    await tick(0)
    expect(status()).toBe('saved')
  })

  it('stops listening for beforeunload after the editor closed', async () => {
    const record = fake.current.seed('CV')
    const { unmount } = mount(record)
    unmount()
    await tick(0)
    useCvEditor.setState({ docId: record.id })
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores changes of another document that is loaded into the store', async () => {
    const record = fake.current.seed('CV')
    const other = fake.current.seed('Other')
    const update = vi.spyOn(fake.current.api, 'update')
    mount(record)
    act(() => useCvEditor.getState().load(other.id, other.document))
    type('Edit on the other doc')
    await tick(5000)
    expect(update).not.toHaveBeenCalled()
  })

  it('goes into conflict when another tab saved first, and "keep mine" overwrites', async () => {
    const record = fake.current.seed('CV')
    mount(record)
    // Another tab saved in between.
    await fake.current.api.update(record.id, { revision: 1, document: record.document })
    type('My version')
    await tick(1000)
    expect(status()).toBe('conflict')
    const revision = (useSaveState.getState().error?.details as { revision: number }).revision
    act(() => overwriteServerCopy(revision))
    await tick(100)
    expect(status()).toBe('saved')
    expect(fake.current.cvs.get(record.id)!.document.header.name).toBe('My version')
  })

  it('"load the latest" replaces the editor content and clears the conflict', async () => {
    const record = fake.current.seed('CV')
    mount(record)
    await fake.current.api.update(record.id, { revision: 1, document: record.document })
    type('My version')
    await tick(1000)
    const latest = await fake.current.api.get(record.id)
    act(() => loadIntoEditor(latest))
    expect(status()).toBe('saved')
    expect(useCvEditor.getState().cv).toEqual(latest.document)
    expect(useCvEditor.getState().past).toHaveLength(0)
  })

  it('flushSave reports success, failure and "nothing to do"', async () => {
    const record = fake.current.seed('CV')
    expect(await flushSave()).toBe(true)
    mount(record)
    expect(await flushSave()).toBe(true)
    fake.current.api.update = async () => {
      throw new ApiRequestError(null, 'network_error', 'offline')
    }
    type('x')
    const result = act(() => flushSave())
    await tick(0)
    expect(await result).toBe(false)
  })

  it('a second editor opened for another CV replaces the first session', async () => {
    const first = fake.current.seed('First')
    const second = fake.current.seed('Second')
    const a = mount(first)
    a.unmount()
    mount(second)
    expect(useCvEditor.getState().docId).toBe(second.id)
    type('Second edited')
    await tick(1000)
    expect(fake.current.cvs.get(second.id)!.document.header.name).toBe('Second edited')
    expect(fake.current.cvs.get(first.id)!.document.header.name).not.toBe('Second edited')
  })

  it('saves the document 100 edits deep, including undo/redo, exactly as it ends', async () => {
    const record = fake.current.seed('CV')
    mount(record)
    for (let i = 0; i < 100; i++) {
      act(() => {
        useCvEditor.getState().setField('header.headline', `h${i}`)
        useCvEditor.getState().endTyping()
      })
    }
    for (let i = 0; i < 40; i++) act(() => useCvEditor.getState().undo())
    for (let i = 0; i < 10; i++) act(() => useCvEditor.getState().redo())
    await tick(1000)
    expect(fake.current.cvs.get(record.id)!.document.header.headline).toBe('h69')
  })
})
