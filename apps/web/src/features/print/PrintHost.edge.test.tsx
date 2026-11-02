import { createEmptyCv, createExampleCv } from '@cv/shared'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { collectUnhandledRejections } from '@/test/unhandled'
import { PrintHost } from './PrintHost'
import { printCv, usePrintJob } from './printCv'

const printRoot = () => screen.queryByTestId('print-root')

describe('printing when things go wrong', () => {
  const print = vi.fn()

  beforeEach(() => {
    print.mockReset()
    vi.spyOn(window, 'print').mockImplementation(print)
    document.title = 'CV Generator'
    usePrintJob.setState({ job: null })
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders nothing while there is no job', () => {
    render(<PrintHost />)
    expect(printRoot()).toBeNull()
  })

  it('prints a CV without sections or photo', async () => {
    const cv = createEmptyCv()
    cv.sections = []
    render(<PrintHost />)
    act(() => printCv(cv, 'Blank'))
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
  })

  it('prints even when the photo cannot be loaded', async () => {
    const cv = createExampleCv('designer')
    cv.header.showPhoto = true
    cv.header.photoUrl = '/api/uploads/gone.jpg'
    render(<PrintHost />)
    act(() => printCv(cv, 'With photo'))
    expect(printRoot()!.querySelector('img')).not.toBeNull()
    expect(print).not.toHaveBeenCalled()
    // The browser could not fetch it: the "error" event must not stall printing. The host starts
    // listening a frame after the job was set, so keep telling it until it has heard.
    await waitFor(() => {
      for (const image of printRoot()!.querySelectorAll('img')) {
        image.dispatchEvent(new Event('error'))
      }
      expect(print).toHaveBeenCalledOnce()
    })
  })

  it('works in a browser without document.fonts', async () => {
    const fonts = Object.getOwnPropertyDescriptor(document, 'fonts')
    Object.defineProperty(document, 'fonts', { value: undefined, configurable: true })
    try {
      render(<PrintHost />)
      act(() => printCv(createEmptyCv(), 'No fonts API'))
      await waitFor(() => expect(print).toHaveBeenCalledOnce())
    } finally {
      if (fonts) Object.defineProperty(document, 'fonts', fonts)
      else delete (document as { fonts?: unknown }).fonts
    }
  })

  it('does not print when the host goes away before the document is ready', async () => {
    const { unmount } = render(<PrintHost />)
    act(() => printCv(createEmptyCv(), 'Never printed'))
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(print).not.toHaveBeenCalled()
    expect(document.title).toBe('CV Generator')
  })

  it("a second request replaces the first, and the first one's afterprint cannot clear the second", async () => {
    render(<PrintHost />)
    act(() => printCv(createEmptyCv(), 'One'))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    act(() => printCv(createEmptyCv(), 'Two'))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2))
    expect(usePrintJob.getState().job?.title).toBe('Two')
    act(() => void window.dispatchEvent(new Event('afterprint')))
    expect(usePrintJob.getState().job).toBeNull()
    expect(document.title).toBe('CV Generator')
  })

  it('20 print requests in a row print at most once per request and end clean', async () => {
    render(<PrintHost />)
    for (let i = 0; i < 20; i++) act(() => printCv(createEmptyCv(), `Job ${i}`))
    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(print.mock.calls.length).toBeLessThanOrEqual(20)
    act(() => void window.dispatchEvent(new Event('afterprint')))
    expect(usePrintJob.getState().job).toBeNull()
    expect(document.title).toBe('CV Generator')
  })

  it('a title with HTML or a very long title is only set as text', async () => {
    render(<PrintHost />)
    act(() => printCv(createEmptyCv(), `<script>alert(1)</script>${'x'.repeat(5000)}`))
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
    expect(document.title.startsWith('<script>')).toBe(true)
    expect(document.querySelector('title script')).toBeNull()
  })

  // BUG: PrintHost calls `window.print()` inside `void whenReady(...).then(...)` with no catch.
  // If printing throws (print is blocked by an enterprise policy, embedded webviews, or an
  // old browser without window.print) the promise rejects unhandled, the job is never cleared
  // (the hidden print copy of the CV stays mounted) and the user gets no message at all.
  // Repro: window.print = () => { throw new Error('blocked') }; printCv(cv, 'x') -> unhandled
  // rejection "blocked"; usePrintJob.getState().job stays set.
  // Expected: no unhandled rejection and the job is cleared.
  it.fails('survives window.print throwing', async () => {
    print.mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<PrintHost />)
    const unhandled = await collectUnhandledRejections(async () => {
      act(() => printCv(createEmptyCv(), 'Blocked'))
      await waitFor(() => expect(print).toHaveBeenCalled())
    })
    expect(unhandled).toEqual([])
    expect(usePrintJob.getState().job).toBeNull()
  })

  it.fails('survives a browser without window.print', async () => {
    vi.restoreAllMocks()
    const original = window.print
    ;(window as { print?: unknown }).print = undefined
    expect(window.print).toBeUndefined()
    try {
      render(<PrintHost />)
      const unhandled = await collectUnhandledRejections(async () => {
        act(() => printCv(createEmptyCv(), 'No print'))
        await new Promise((resolve) => setTimeout(resolve, 600))
      })
      expect(unhandled).toEqual([])
    } finally {
      window.print = original
    }
  })
})
