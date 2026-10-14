import { createEmptyCv, type CvDocument, type CvRecord } from '@cv/shared'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { ApiRequestError } from '../../lib/api'
import { AutosaveController, type SaveState } from './autosave'

const record = (document: CvDocument, revision: number): CvRecord => ({
  id: 'cv-1',
  type: 'cv',
  title: 'CV',
  professionId: null,
  jobId: null,
  revision,
  document,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
})

const edit = (doc: CvDocument, name: string): CvDocument => ({
  ...doc,
  header: { ...doc.header, name },
})

describe('AutosaveController', () => {
  let states: SaveState[]
  let save: Mock<(document: CvDocument, revision: number) => Promise<CvRecord>>
  let controller: AutosaveController
  const base = createEmptyCv()
  const status = () => states.at(-1)!.status

  beforeEach(() => {
    vi.useFakeTimers()
    states = []
    save = vi.fn(async (document: CvDocument, revision: number) => record(document, revision + 1))
    controller = new AutosaveController({
      save,
      onState: (s) => states.push(s),
      delayMs: 1000,
      retryDelaysMs: [2000, 5000],
    })
    controller.start(record(base, 1))
  })
  afterEach(() => vi.useRealTimers())

  it('waits for a quiet second, then saves the latest document once', async () => {
    controller.change(edit(base, 'M'))
    await vi.advanceTimersByTimeAsync(500)
    const latest = edit(base, 'Maria')
    controller.change(latest)
    expect(status()).toBe('pending')
    await vi.advanceTimersByTimeAsync(999)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(latest, 1)
    expect(status()).toBe('saved')
  })

  it('sends the new revision with the next save', async () => {
    controller.change(edit(base, 'A'))
    await vi.advanceTimersByTimeAsync(1000)
    controller.change(edit(base, 'B'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(save.mock.calls.map((c) => c[1])).toEqual([1, 2])
  })

  it('never runs two saves at once and saves changes made during a save afterwards', async () => {
    let finish!: () => void
    save.mockImplementationOnce(
      (document: CvDocument) =>
        new Promise<CvRecord>((resolve) => (finish = () => resolve(record(document, 2)))),
    )
    controller.change(edit(base, 'A'))
    await vi.advanceTimersByTimeAsync(1000)
    const later = edit(base, 'AB')
    controller.change(later)
    await vi.advanceTimersByTimeAsync(5000)
    expect(save).toHaveBeenCalledTimes(1)
    finish()
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(later, 2)
    expect(status()).toBe('saved')
  })

  it('goes back to "saved" when a change is undone before saving', async () => {
    controller.change(edit(base, 'A'))
    controller.change(base)
    await vi.advanceTimersByTimeAsync(2000)
    expect(save).not.toHaveBeenCalled()
    expect(status()).toBe('saved')
  })

  it('retries with backoff after a network error', async () => {
    save.mockRejectedValueOnce(new ApiRequestError(null, 'network_error', 'offline'))
    controller.change(edit(base, 'A'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(status()).toBe('error')
    await vi.advanceTimersByTimeAsync(1999)
    expect(save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(2)
    expect(status()).toBe('saved')
  })

  it('does not retry an error that cannot succeed (e.g. invalid data)', async () => {
    save.mockRejectedValueOnce(new ApiRequestError(400, 'validation_error', 'bad'))
    controller.change(edit(base, 'A'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(status()).toBe('error')
  })

  it('stops on a conflict until the user chooses to overwrite', async () => {
    save.mockRejectedValueOnce(
      new ApiRequestError(409, 'conflict', 'changed elsewhere', { revision: 7 }),
    )
    controller.change(edit(base, 'A'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(status()).toBe('conflict')
    controller.change(edit(base, 'AB'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(save).toHaveBeenCalledTimes(1)

    controller.overwrite(7)
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenLastCalledWith(edit(base, 'AB'), 7)
    expect(status()).toBe('saved')
  })

  it('flush saves immediately and reports success', async () => {
    controller.change(edit(base, 'A'))
    const saved = controller.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(await saved).toBe(true)
    expect(save).toHaveBeenCalledTimes(1)
    expect(controller.hasUnsavedChanges()).toBe(false)
  })

  it('flush reports failure instead of hanging when the save fails', async () => {
    save.mockRejectedValue(new ApiRequestError(null, 'network_error', 'offline'))
    controller.change(edit(base, 'A'))
    const saved = controller.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(await saved).toBe(false)
  })
})
