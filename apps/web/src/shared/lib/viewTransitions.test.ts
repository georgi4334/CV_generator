import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDocTransition } from '@/shared/stores/docTransition'
import { DOC_TRANSITION_NAME, runViewTransition } from './viewTransitions'

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition')
  useDocTransition.setState({ openedId: null })
})

/** A stand-in for the browser API: runs the update and finishes at once. */
function fakeStartViewTransition() {
  let finish = () => {}
  const finished = new Promise<void>((resolve) => (finish = resolve))
  const start = vi.fn((update: () => void) => {
    update()
    return { finished, ready: Promise.resolve(), updateCallbackDone: Promise.resolve() }
  })
  Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true })
  return { start, finish: () => finish() }
}

describe('runViewTransition', () => {
  it('just updates when the browser has no view transitions', () => {
    const update = vi.fn()
    runViewTransition('doc-close', update)
    expect(update).toHaveBeenCalledOnce()
    expect(document.documentElement.dataset.transition).toBeUndefined()
  })

  it('marks the kind while it runs and names the thumbnail a document opens from', async () => {
    const { start, finish } = fakeStartViewTransition()
    const thumbnail = document.createElement('div')
    const update = vi.fn()
    runViewTransition('doc-open', update, { source: thumbnail, docId: 'cv-1' })

    expect(start).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledOnce()
    expect(document.documentElement.dataset.transition).toBe('doc-open')
    expect(thumbnail.style.viewTransitionName).toBe(DOC_TRANSITION_NAME)
    expect(useDocTransition.getState().openedId).toBe('cv-1')

    finish()
    await vi.waitFor(() => expect(document.documentElement.dataset.transition).toBeUndefined())
    expect(thumbnail.style.viewTransitionName).toBe('')
  })

  it('forgets the opened document once it has closed into its thumbnail', async () => {
    const { finish } = fakeStartViewTransition()
    useDocTransition.setState({ openedId: 'cv-1' })
    runViewTransition('doc-close', vi.fn())
    finish()
    await vi.waitFor(() => expect(useDocTransition.getState().openedId).toBeNull())
  })
})
