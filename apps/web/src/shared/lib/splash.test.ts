import { afterEach, describe, expect, it, vi } from 'vitest'
import { hideSplash } from './splash'

afterEach(() => vi.useRealTimers())

describe('hideSplash', () => {
  it('fades the splash out after the app has painted, then removes it', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame', 'performance'] })
    document.body.innerHTML = '<div id="splash"></div>'
    hideSplash()
    vi.runAllTimers()
    expect(document.getElementById('splash')).toBeNull()
  })

  it('does nothing when there is no splash (tests, later navigations)', () => {
    document.body.innerHTML = ''
    expect(() => hideSplash()).not.toThrow()
  })
})
