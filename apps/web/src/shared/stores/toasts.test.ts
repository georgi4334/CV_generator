import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as motion from '@/shared/lib/motion'
import { dismissToast, removeToast, showToast, useToasts } from './toasts'

const toasts = () => useToasts.getState().toasts

beforeEach(() => useToasts.setState({ toasts: [] }))
afterEach(() => vi.restoreAllMocks())

describe('toast store', () => {
  it('gives every toast its own id, also when shown in the same tick', () => {
    const ids = Array.from({ length: 100 }, (_, i) => showToast({ tone: 'info', message: `n${i}` }))
    expect(new Set(ids).size).toBe(100)
    expect(toasts()).toHaveLength(100)
  })

  it('keeps toasts in the order they were shown', () => {
    for (const message of ['a', 'b', 'c']) showToast({ tone: 'info', message })
    expect(toasts().map((t) => t.message)).toEqual(['a', 'b', 'c'])
  })

  it('shows a repeated toast with the same id once, in its original place, with the new text', () => {
    showToast({ id: 'save', tone: 'info', message: 'Saving' })
    showToast({ tone: 'info', message: 'Other' })
    for (let i = 0; i < 50; i++) showToast({ id: 'save', tone: 'warning', message: `try ${i}` })
    expect(toasts()).toHaveLength(2)
    expect(toasts()[0]).toMatchObject({ id: 'save', tone: 'warning', message: 'try 49' })
  })

  it('a toast replaced with the same id is no longer "leaving"', () => {
    vi.spyOn(motion, 'canAnimate').mockReturnValue(true)
    showToast({ id: 'x', tone: 'error', message: 'first' })
    dismissToast('x')
    expect(toasts()[0]!.leaving).toBe(true)
    showToast({ id: 'x', tone: 'error', message: 'again' })
    expect(toasts()[0]!.leaving).toBeUndefined()
  })

  it('removing or dismissing an id that does not exist does nothing', () => {
    showToast({ id: 'a', tone: 'info', message: 'a' })
    removeToast('nope')
    dismissToast('nope')
    expect(toasts()).toHaveLength(1)
    expect(toasts()[0]!.leaving).toBeUndefined()
  })

  it('removes a toast at once', () => {
    showToast({ id: 'a', tone: 'info', message: 'a' })
    removeToast('a')
    removeToast('a')
    expect(toasts()).toEqual([])
  })

  it('dismissing removes at once when nothing can animate', () => {
    vi.spyOn(motion, 'canAnimate').mockReturnValue(false)
    showToast({ id: 'a', tone: 'error', message: 'a' })
    dismissToast('a')
    expect(toasts()).toEqual([])
  })

  it('dismissing with animations only marks the toast as leaving', () => {
    vi.spyOn(motion, 'canAnimate').mockReturnValue(true)
    showToast({ id: 'a', tone: 'error', message: 'a' })
    showToast({ id: 'b', tone: 'error', message: 'b' })
    dismissToast('a')
    expect(toasts().map((t) => [t.id, t.leaving ?? false])).toEqual([
      ['a', true],
      ['b', false],
    ])
  })

  // BUG (unbounded growth): there is no limit on how many toasts are stored or shown. A loop
  // that reports an error on every failed request (e.g. offline autosave retried, or a list of
  // 500 failed rows) stacks hundreds of cards that cover the page; each one must be closed by hand.
  // Repro: for (i of 1..100) showToast({ tone: 'error', message: `Failed ${i}` }) -> 100 toasts.
  // Expected: a bounded number (for example 5) of visible toasts.
  it.fails('keeps a bounded number of toasts when 100 errors arrive quickly', () => {
    for (let i = 0; i < 100; i++) showToast({ tone: 'error', message: `Failed ${i}` })
    expect(toasts().length).toBeLessThanOrEqual(10)
  })

  it('accepts React nodes, long text and emoji as the message', () => {
    expect(() => showToast({ tone: 'success', message: '🚀'.repeat(10_000) })).not.toThrow()
  })
})
