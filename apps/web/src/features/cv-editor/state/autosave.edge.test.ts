import { createEmptyCv, type CvDocument, type CvRecord } from '@cv/shared'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
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

const offline = () => new ApiRequestError(null, 'network_error', 'offline')
const serverDown = () => new ApiRequestError(503, 'http_error', 'down')
const conflict = (revision: number) =>
  new ApiRequestError(409, 'conflict', 'changed elsewhere', { revision })

describe('AutosaveController edge cases', () => {
  let states: SaveState[]
  let save: Mock<(document: CvDocument, revision: number) => Promise<CvRecord>>
  let onSaved: Mock<(record: CvRecord) => void>
  let controller: AutosaveController<CvDocument, CvRecord>
  const base = createEmptyCv()
  const status = () => states.at(-1)!.status
  const savedNames = () => save.mock.calls.map((c) => c[0].header.name)

  beforeEach(() => {
    vi.useFakeTimers()
    states = []
    save = vi.fn(async (document: CvDocument, revision: number) => record(document, revision + 1))
    onSaved = vi.fn()
    controller = new AutosaveController<CvDocument, CvRecord>({
      save,
      onState: (s) => states.push(s),
      onSaved,
      delayMs: 1000,
      retryDelaysMs: [2000, 5000],
    })
    controller.start(record(base, 1))
  })
  afterEach(() => {
    controller.dispose()
    vi.useRealTimers()
  })

  describe('too many edits', () => {
    it('coalesces 500 rapid edits into a single request with the latest document', async () => {
      for (let i = 1; i <= 500; i++) {
        controller.change(edit(base, `name ${i}`))
        await vi.advanceTimersByTimeAsync(10)
      }
      expect(save).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1000)
      expect(save).toHaveBeenCalledTimes(1)
      expect(savedNames()).toEqual(['name 500'])
      expect(status()).toBe('saved')
    })

    it('saves a bounded number of times while someone keeps typing for five minutes', async () => {
      // A keystroke every 700 ms: faster than the 1 s quiet time, so nothing is saved until a pause.
      for (let t = 0; t < 300_000; t += 700) {
        controller.change(edit(base, `typing ${t}`))
        await vi.advanceTimersByTimeAsync(700)
      }
      expect(save.mock.calls.length).toBeLessThanOrEqual(1)
      await vi.advanceTimersByTimeAsync(1000)
      expect(save.mock.calls.length).toBeLessThanOrEqual(2)
      expect(controller.hasUnsavedChanges()).toBe(false)
      expect(status()).toBe('saved')
    })

    it('with slow typing and a slow server never has two requests in flight', async () => {
      let running = 0
      let maxRunning = 0
      save.mockImplementation(async (document, revision) => {
        running += 1
        maxRunning = Math.max(maxRunning, running)
        await new Promise((resolve) => setTimeout(resolve, 3000))
        running -= 1
        return record(document, revision + 1)
      })
      for (let i = 0; i < 40; i++) {
        controller.change(edit(base, `slow ${i}`))
        await vi.advanceTimersByTimeAsync(1500)
      }
      await vi.advanceTimersByTimeAsync(20_000)
      expect(maxRunning).toBe(1)
      expect(controller.hasUnsavedChanges()).toBe(false)
      expect(savedNames().at(-1)).toBe('slow 39')
    })

    it('saves a one megabyte document like any other', async () => {
      const huge = edit(base, 'x'.repeat(1_000_000))
      controller.change(huge)
      await vi.advanceTimersByTimeAsync(1000)
      expect(save).toHaveBeenCalledWith(huge, 1)
      expect(status()).toBe('saved')
    })
  })

  describe('edits while a save is running', () => {
    it('sends the revision the server returned, not the old one', async () => {
      let finish!: (revision: number) => void
      save.mockImplementationOnce(
        (document) => new Promise((resolve) => (finish = (r) => resolve(record(document, r)))),
      )
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      controller.change(edit(base, 'AB'))
      expect(status()).toBe('saving')
      finish(40)
      await vi.advanceTimersByTimeAsync(1000)
      expect(save.mock.calls.map((c) => c[1])).toEqual([1, 40])
    })

    it('shows "pending" again after a save finishes with newer unsaved edits', async () => {
      let finish!: () => void
      save.mockImplementationOnce(
        (document) => new Promise((resolve) => (finish = () => resolve(record(document, 2)))),
      )
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      controller.change(edit(base, 'AB'))
      finish()
      await vi.advanceTimersByTimeAsync(0)
      expect(status()).toBe('pending')
      await vi.advanceTimersByTimeAsync(1000)
      expect(status()).toBe('saved')
    })

    it('does not mark the document saved when it was changed back to the saved one mid-save', async () => {
      let finish!: () => void
      save.mockImplementationOnce(
        (document) => new Promise((resolve) => (finish = () => resolve(record(document, 2)))),
      )
      const a = edit(base, 'A')
      controller.change(a)
      await vi.advanceTimersByTimeAsync(1000)
      // Undo back to the very first document while the request for "A" is in the air.
      controller.change(base)
      finish()
      await vi.advanceTimersByTimeAsync(1000)
      // The server now has "A"; the editor shows "base" - that must be saved too.
      expect(savedNames()).toEqual(['A', ''])
      expect(controller.hasUnsavedChanges()).toBe(false)
    })
  })

  describe('failures', () => {
    it('uses the last delay for every later retry and eventually succeeds', async () => {
      save
        .mockRejectedValueOnce(offline())
        .mockRejectedValueOnce(offline())
        .mockRejectedValueOnce(offline())
        .mockRejectedValueOnce(offline())
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(save).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(2000)
      expect(save).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(5000)
      expect(save).toHaveBeenCalledTimes(3)
      await vi.advanceTimersByTimeAsync(4999)
      expect(save).toHaveBeenCalledTimes(3)
      await vi.advanceTimersByTimeAsync(1)
      expect(save).toHaveBeenCalledTimes(4)
      await vi.advanceTimersByTimeAsync(5000)
      expect(save).toHaveBeenCalledTimes(5)
      expect(status()).toBe('saved')
      expect(states.at(-1)!.error).toBeNull()
    })

    it('retries a server error (503) as well as a network error', async () => {
      save.mockRejectedValueOnce(serverDown())
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(3000)
      expect(save).toHaveBeenCalledTimes(2)
      expect(status()).toBe('saved')
    })

    it('does not hammer a server that keeps failing: one request per back-off step', async () => {
      save.mockRejectedValue(offline())
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000 + 2000 + 5000 * 10)
      // 1 initial + 1 (2 s) + 10 (5 s each)
      expect(save).toHaveBeenCalledTimes(12)
      expect(status()).toBe('error')
    })

    it('keeps the error object so the UI can explain it', async () => {
      save.mockRejectedValueOnce(new ApiRequestError(500, 'internal_error', 'boom'))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(states.at(-1)!.error).toMatchObject({ status: 500, code: 'internal_error' })
    })

    it('turns a thrown non-API error (e.g. a TypeError) into an error state, not a crash', async () => {
      save.mockRejectedValueOnce(new TypeError('x is not a function'))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(status()).toBe('error')
      expect(states.at(-1)!.error?.code).toBe('unknown_error')
    })

    it('saves the newest document, not the failed one, when retrying after more edits', async () => {
      save.mockRejectedValueOnce(offline())
      controller.change(edit(base, 'first'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(status()).toBe('error')
      controller.change(edit(base, 'second'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(savedNames()).toEqual(['first', 'second'])
      expect(status()).toBe('saved')
    })

    it('stops the retry timer when the user undoes back to the saved document', async () => {
      save.mockRejectedValue(offline())
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(status()).toBe('error')
      controller.change(base)
      expect(status()).toBe('saved')
      expect(states.at(-1)!.error).toBeNull()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('does not retry a 403, 404 or 413', async () => {
      for (const status of [403, 404, 413]) {
        save.mockClear()
        save.mockRejectedValueOnce(new ApiRequestError(status, 'x', 'no'))
        controller.start(record(base, 1))
        controller.change(edit(base, `S${status}`))
        await vi.advanceTimersByTimeAsync(60_000)
        expect(save, String(status)).toHaveBeenCalledTimes(1)
      }
    })

    it('a timeout reported as a network error is retried', async () => {
      save.mockRejectedValueOnce(new ApiRequestError(null, 'network_error', 'timeout of 15000ms'))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(3000)
      expect(save).toHaveBeenCalledTimes(2)
    })
  })

  describe('revision conflicts', () => {
    it('does not call onSaved for a failed save', async () => {
      save.mockRejectedValueOnce(conflict(9))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(onSaved).not.toHaveBeenCalled()
    })

    it('flush gives up at once on a conflict instead of hanging', async () => {
      save.mockRejectedValueOnce(conflict(9))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      const flushed = controller.flush()
      await vi.advanceTimersByTimeAsync(0)
      expect(await flushed).toBe(false)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('keeps edits made during a conflict and saves them all after "overwrite"', async () => {
      save.mockRejectedValueOnce(conflict(9))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      for (const name of ['B', 'C', 'D']) controller.change(edit(base, name))
      expect(controller.hasUnsavedChanges()).toBe(true)
      expect(status()).toBe('conflict')
      controller.overwrite(9)
      await vi.advanceTimersByTimeAsync(0)
      expect(save).toHaveBeenLastCalledWith(edit(base, 'D'), 9)
      expect(status()).toBe('saved')
    })

    it('can run into a second conflict after overwriting', async () => {
      save.mockRejectedValueOnce(conflict(9)).mockRejectedValueOnce(conflict(12))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      controller.overwrite(9)
      await vi.advanceTimersByTimeAsync(0)
      expect(status()).toBe('conflict')
      controller.overwrite(12)
      await vi.advanceTimersByTimeAsync(0)
      expect(save).toHaveBeenLastCalledWith(edit(base, 'A'), 12)
      expect(status()).toBe('saved')
    })

    it('a conflict never schedules a retry', async () => {
      save.mockRejectedValue(conflict(9))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(120_000)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('"start" with the server copy leaves the conflict', async () => {
      save.mockRejectedValueOnce(conflict(9))
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      const theirs = edit(base, 'theirs')
      controller.start(record(theirs, 9))
      expect(status()).toBe('saved')
      expect(controller.hasUnsavedChanges()).toBe(false)
      controller.change(edit(theirs, 'theirs+mine'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(save).toHaveBeenLastCalledWith(edit(theirs, 'theirs+mine'), 9)
    })
  })

  describe('flush', () => {
    it('resolves true at once when nothing changed', async () => {
      expect(await controller.flush()).toBe(true)
      expect(save).not.toHaveBeenCalled()
    })

    it('waits for a save in flight and then saves the edits made meanwhile', async () => {
      let finish!: () => void
      save.mockImplementationOnce(
        (document) => new Promise((resolve) => (finish = () => resolve(record(document, 2)))),
      )
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      controller.change(edit(base, 'AB'))
      let result: boolean | null = null
      void controller.flush().then((r) => (result = r))
      await vi.advanceTimersByTimeAsync(0)
      expect(result).toBeNull()
      finish()
      await vi.advanceTimersByTimeAsync(0)
      expect(result).toBe(true)
      expect(savedNames()).toEqual(['A', 'AB'])
    })

    it('cancels the pending quiet-time timer so the save is not duplicated', async () => {
      controller.change(edit(base, 'A'))
      const flushed = controller.flush()
      await vi.advanceTimersByTimeAsync(5000)
      expect(await flushed).toBe(true)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('returns false for an error that cannot succeed and does not loop', async () => {
      save.mockRejectedValue(new ApiRequestError(400, 'validation_error', 'bad'))
      controller.change(edit(base, 'A'))
      const flushed = controller.flush()
      await vi.advanceTimersByTimeAsync(0)
      expect(await flushed).toBe(false)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('can be called many times at once and still saves once', async () => {
      controller.change(edit(base, 'A'))
      const results = Promise.all(Array.from({ length: 25 }, () => controller.flush()))
      await vi.advanceTimersByTimeAsync(0)
      expect(await results).toEqual(Array.from({ length: 25 }, () => true))
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('succeeds after a failure once the network is back', async () => {
      save.mockRejectedValueOnce(offline())
      controller.change(edit(base, 'A'))
      const first = controller.flush()
      await vi.advanceTimersByTimeAsync(0)
      expect(await first).toBe(false)
      const second = controller.flush()
      await vi.advanceTimersByTimeAsync(0)
      expect(await second).toBe(true)
      expect(status()).toBe('saved')
    })
  })

  describe('leaving the page (dispose)', () => {
    it('does not save after dispose and still reports the unsaved edits', async () => {
      controller.change(edit(base, 'A'))
      controller.dispose()
      await vi.advanceTimersByTimeAsync(10_000)
      expect(save).not.toHaveBeenCalled()
      expect(controller.hasUnsavedChanges()).toBe(true)
    })

    it('lets a save that is already running finish, but starts no follow-up', async () => {
      let finish!: () => void
      save.mockImplementationOnce(
        (document) => new Promise((resolve) => (finish = () => resolve(record(document, 2)))),
      )
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      controller.change(edit(base, 'AB'))
      controller.dispose()
      finish()
      await vi.advanceTimersByTimeAsync(10_000)
      expect(save).toHaveBeenCalledTimes(1)
      expect(onSaved).toHaveBeenCalledTimes(1)
    })

    it('does not retry a failed save after dispose', async () => {
      save.mockRejectedValue(offline())
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000)
      controller.dispose()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('flush after dispose does not hang', async () => {
      controller.change(edit(base, 'A'))
      controller.dispose()
      expect(await controller.flush()).toBe(false)
    })

    it('ignores "overwrite" after dispose', async () => {
      controller.dispose()
      controller.overwrite(5)
      await vi.advanceTimersByTimeAsync(5000)
      expect(save).not.toHaveBeenCalled()
    })
  })

  describe('start', () => {
    it('drops a pending save when another document is loaded', async () => {
      controller.change(edit(base, 'A'))
      controller.start(record(edit(base, 'server'), 5))
      await vi.advanceTimersByTimeAsync(5000)
      expect(save).not.toHaveBeenCalled()
      expect(status()).toBe('saved')
    })

    it('reports the time of the loaded record as the last save', () => {
      controller.start({ ...record(base, 3), updatedAt: '2026-01-02T03:04:05.000Z' })
      expect(states.at(-1)!.lastSavedAt?.toISOString()).toBe('2026-01-02T03:04:05.000Z')
    })

    it('resets the back-off after a restart', async () => {
      save.mockRejectedValueOnce(offline()).mockRejectedValueOnce(offline())
      controller.change(edit(base, 'A'))
      await vi.advanceTimersByTimeAsync(1000 + 2000)
      expect(save).toHaveBeenCalledTimes(2)
      controller.start(record(base, 7))
      save.mockRejectedValueOnce(offline())
      controller.change(edit(base, 'B'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(save).toHaveBeenCalledTimes(3)
      // The first retry delay again (2 s), not the longer one.
      await vi.advanceTimersByTimeAsync(2000)
      expect(save).toHaveBeenCalledTimes(4)
    })
  })
})
