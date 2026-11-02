import { AxiosError } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { i18n, setLanguage } from '@/i18n'
import { en } from '@/i18n/locales/en'
import { ApiRequestError } from './client'
import { errorMessage } from './errorMessage'

afterEach(() => setLanguage('en', { remember: false }))

describe('errorMessage', () => {
  it('translates the codes the app knows', () => {
    expect(errorMessage(new ApiRequestError(401, 'invalid_credentials', 'raw'))).toBe(
      'Wrong email or password',
    )
  })

  it('translates network errors without showing the technical text', () => {
    const message = errorMessage(new ApiRequestError(null, 'network_error', 'raw'))
    expect(message).toBe(i18n.t('errors.network_error'))
    expect(message).not.toBe('raw')
  })

  it('shows the server text for a code it has no translation for', () => {
    expect(errorMessage(new ApiRequestError(400, 'brand_new_code', 'Server says no'))).toBe(
      'Server says no',
    )
  })

  // BUG: errorMessage looks the server's code up with `i18n.exists('errors.<code>')`, so a code that
  // names an Object.prototype member ("constructor", "toString", "__proto__", "hasOwnProperty")
  // returns a function/object (or an i18next "returned an object" text) instead of the server's
  // message. Repro: errorMessage(new ApiRequestError(400, 'constructor', 'Server text')).
  // Expected: 'Server text'. Low risk today (codes come from our own API), but it breaks the
  // "always a string" contract.
  for (const code of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    it.fails(`does not mistake the code "${code}" for a translation key`, () => {
      expect(errorMessage(new ApiRequestError(400, code, 'Server text'))).toBe('Server text')
    })
  }

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'plain'],
    ['an object', { weird: true }],
    ['an Error', new Error('exploded')],
  ])('always returns a string for %s', (_, cause) => {
    const message = errorMessage(cause)
    expect(typeof message).toBe('string')
    expect(message.length).toBeGreaterThan(0)
  })

  it('uses the generic text for a failed request with an HTML body', () => {
    const cause = new AxiosError('x', 'ERR_BAD_RESPONSE', undefined, null, {
      status: 502,
      data: '<html>Bad gateway</html>',
      statusText: '',
      headers: {},
      config: {} as never,
    })
    expect(errorMessage(cause)).not.toContain('<html>')
  })

  it('has an English text for every error code the API documents', () => {
    const codes = Object.keys((en as unknown as { errors: Record<string, string> }).errors)
    expect(codes).toEqual(expect.arrayContaining(['network_error', 'conflict', 'not_found']))
    for (const code of codes) {
      expect(errorMessage(new ApiRequestError(400, code, 'raw')), code).not.toBe('raw')
    }
  })

  it.each(['bg', 'de'] as const)('speaks %s once the language is switched', async (language) => {
    await setLanguage(language, { remember: false })
    const message = errorMessage(new ApiRequestError(null, 'network_error', 'raw'))
    expect(message).not.toBe(en.errors.network_error)
    expect(message).toBe(i18n.t('errors.network_error'))
  })
})
