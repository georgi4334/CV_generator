import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useTranslation } from 'react-i18next'
import { detectLanguage, i18n, setLanguage } from '.'
import { formatDate } from '../lib/format'
import { errorMessage } from '../lib/errorMessage'
import { ApiRequestError } from '../lib/api'
import { bg } from './locales/bg'
import { de } from './locales/de'
import { en } from './locales/en'

afterEach(async () => {
  await setLanguage('en')
  localStorage.clear()
})

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  )
}
const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort()
const flat = (messages: unknown): Record<string, string> =>
  Object.fromEntries(
    keys(messages).map((k) => [
      k,
      k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], messages) as string,
    ]),
  )

describe('translations', () => {
  it.each([
    ['bg', bg],
    ['de', de],
  ])('%s has every English key, with the same placeholders, and nothing empty', (_, messages) => {
    expect(keys(messages).sort()).toEqual(keys(en).sort())
    const source = flat(en)
    for (const [key, text] of Object.entries(flat(messages))) {
      expect(text, key).not.toBe('')
      expect(placeholders(text as string), key).toEqual(placeholders(source[key] as string))
    }
  })
})

describe('switching the language', () => {
  function Greeting() {
    const { t } = useTranslation()
    return <p>{t('common.save')}</p>
  }

  it('updates mounted components without a reload, and remembers the choice', async () => {
    render(<Greeting />)
    expect(screen.getByText('Save')).toBeDefined()
    await act(() => setLanguage('de'))
    expect(screen.getByText('Speichern')).toBeDefined()
    expect(document.documentElement.lang).toBe('de')
    expect(localStorage.getItem('cv-ui-language')).toBe('de')
    await act(() => setLanguage('bg'))
    expect(screen.getByText('Запази')).toBeDefined()
    expect(detectLanguage()).toBe('bg')
  })

  it('formats dates and API errors in the interface language', async () => {
    await setLanguage('de')
    expect(formatDate('2026-10-13')).toMatch(/13\. Okt\.? 2026/)
    expect(
      errorMessage(new ApiRequestError(401, 'invalid_credentials', 'Wrong email or password')),
    ).toBe('E-Mail oder Passwort ist falsch')
    // Unknown codes keep the server's message.
    expect(errorMessage(new ApiRequestError(400, 'something_new', 'Server text'))).toBe(
      'Server text',
    )
    expect(i18n.language).toBe('de')
  })

  it('uses the browser language when nothing is saved', () => {
    const original = navigator.languages
    Object.defineProperty(navigator, 'languages', { value: ['de-AT', 'en'], configurable: true })
    expect(detectLanguage()).toBe('de')
    Object.defineProperty(navigator, 'languages', { value: ['fr-FR'], configurable: true })
    expect(detectLanguage()).toBe('en')
    Object.defineProperty(navigator, 'languages', { value: original, configurable: true })
  })
})
