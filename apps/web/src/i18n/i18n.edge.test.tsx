import { APP_NAME } from '@cv/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectLanguage, hasStoredLanguage, i18n, setLanguage } from '.'
import { UI_LANGUAGES, UI_LANGUAGE_NAMES, UI_LOCALES } from './languages'
import { bg } from './locales/bg'
import { de } from './locales/de'
import { en } from './locales/en'

const catalogs = { en, bg, de } as const
const OTHERS = [
  ['bg', bg],
  ['de', de],
] as const

function flat(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]]
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  )
}
const entries = (messages: unknown) => flat(messages)
const tags = (text: string) => [...text.matchAll(/<\/?(\w+)\s*\/?>/g)].map((m) => m[0]).sort()
const vars = (text: string) => [...text.matchAll(/{{\s*[-\w]+\s*}}/g)].map((m) => m[0]).sort()

const setNavigatorLanguages = (languages: unknown, language = 'en-US') => {
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true })
  Object.defineProperty(navigator, 'language', { value: language, configurable: true })
}

afterEach(async () => {
  vi.restoreAllMocks()
  localStorage.clear()
  await setLanguage('en', { remember: false })
})

describe('catalog shape', () => {
  it.each(Object.entries(catalogs))(
    '%s has no empty or placeholder-looking text',
    (_, messages) => {
      for (const [key, text] of entries(messages)) {
        expect(text.trim(), key).not.toBe('')
        expect(text, key).not.toMatch(/\b(TODO|FIXME|lorem ipsum|undefined|\[object)\b/i)
        expect(text.trim(), key).not.toMatch(/\s{2,}/)
      }
    },
  )

  it.each(OTHERS)('%s pads fragments with spaces exactly where English does', (_, messages) => {
    const source = Object.fromEntries(entries(en))
    const edge = (text: string) => [/^\s*/.exec(text)![0], /\s*$/.exec(text)![0]]
    for (const [key, text] of entries(messages)) {
      expect(edge(text), key).toEqual(edge(source[key]!))
    }
  })

  it.each(OTHERS)('%s uses the same markup tags as English in every text', (_, messages) => {
    const source = Object.fromEntries(entries(en))
    for (const [key, text] of entries(messages)) {
      expect(tags(text), key).toEqual(tags(source[key]!))
    }
  })

  it.each(OTHERS)('%s keeps every {{variable}} of English, including {{app}}', (_, messages) => {
    const source = Object.fromEntries(entries(en))
    for (const [key, text] of entries(messages)) {
      expect(vars(text), key).toEqual(vars(source[key]!))
    }
  })

  it.each(OTHERS)('%s has no key that English does not have', (_, messages) => {
    const english = new Set(entries(en).map(([key]) => key))
    const extra = entries(messages)
      .map(([key]) => key)
      .filter((key) => !english.has(key))
    expect(extra).toEqual([])
  })

  it.each(Object.entries(catalogs))(
    '%s has no duplicated leaf paths with different spelling',
    (_, messages) => {
      const keys = entries(messages).map(([key]) => key.toLowerCase())
      expect(new Set(keys).size).toBe(keys.length)
    },
  )

  it.each(Object.entries(catalogs))(
    '%s has a complete set of plural forms for every counted text',
    (language, messages) => {
      const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories
      const required = categories.filter(
        (c) => c === 'one' || c === 'other' || c === 'few' || c === 'many',
      )
      const all = new Set(entries(messages).map(([key]) => key))
      const bases = new Set(
        [...all]
          .map((key) => /^(.*)_(zero|one|two|few|many|other)$/.exec(key)?.[1])
          .filter((base): base is string => Boolean(base)),
      )
      expect(bases.size).toBeGreaterThan(5)
      for (const base of bases) {
        for (const category of required) {
          expect(all.has(`${base}_${category}`), `${base}_${category}`).toBe(true)
        }
      }
    },
  )

  it.each(Object.entries(catalogs))('%s plural texts all show the count', (_, messages) => {
    for (const [key, text] of entries(messages)) {
      if (/_(zero|one|two|few|many|other)$/.test(key)) {
        // "one" may say "a"/"one" in words, but the English source always has {{count}} or a number.
        if (!key.endsWith('_one') && !key.endsWith('_zero')) {
          expect(text, key).toMatch(/{{\s*count\s*}}/)
        }
      }
    }
  })

  it('every interface language has a name and a date locale', () => {
    for (const language of UI_LANGUAGES) {
      expect(UI_LANGUAGE_NAMES[language].length).toBeGreaterThan(1)
      expect(() => new Intl.DateTimeFormat(UI_LOCALES[language])).not.toThrow()
    }
  })
})

describe('counts and plurals as users see them', () => {
  it.each([0, 1, 2, 5, 21, 100, 1_000_000])('English: %i jobs', (count) => {
    const text = i18n.t('jobs.count', { count })
    expect(text).toContain(String(count))
    expect(text).not.toMatch(/{{|}}/)
  })

  it.each(['bg', 'de'] as const)(
    '%s: every count shows its number and no raw placeholder',
    async (language) => {
      await setLanguage(language, { remember: false })
      for (const count of [0, 1, 2, 3, 5, 11, 21, 101, 1_000_000]) {
        const text = i18n.t('jobs.count', { count })
        expect(text).toContain(String(count))
        expect(text).not.toMatch(/{{|}}/)
      }
    },
  )

  it('a negative or fractional count still gives text', () => {
    expect(i18n.t('jobs.count', { count: -1 })).toContain('-1')
    expect(i18n.t('jobs.count', { count: 1.5 })).toContain('1.5')
  })

  it('NaN as a count does not throw', () => {
    expect(() => i18n.t('jobs.count', { count: Number.NaN })).not.toThrow()
  })
})

describe('missing and unusual input', () => {
  it('a variable that is not given stays visible instead of vanishing', () => {
    expect(i18n.t('jobs.filteredCount', { count: 3 })).toContain('{{')
  })

  it('values with HTML are not escaped by i18next (React escapes when rendering)', () => {
    const text = i18n.t('jobs.deleteMessage', { position: '<b>x</b>', company: '<i>y</i>' })
    expect(text).toContain('<b>x</b>')
  })

  it('values with {{braces}} are not interpreted a second time', () => {
    const text = i18n.t('jobs.deleteMessage', { position: '{{company}}', company: 'Acme' })
    expect(text).toContain('Acme')
  })

  it('an unknown key shows the key itself instead of throwing', () => {
    expect(i18n.t('this.key.does.not.exist' as never)).toBe('this.key.does.not.exist')
    expect(i18n.exists('this.key.does.not.exist')).toBe(false)
  })

  it('the product name is available as {{app}} in every language', async () => {
    for (const language of UI_LANGUAGES) {
      await setLanguage(language, { remember: false })
      expect(i18n.t('common.appName')).toBe(APP_NAME)
    }
  })

  it('switching language back and forth 30 times ends in the last language', async () => {
    for (let i = 0; i < 30; i++)
      await setLanguage(UI_LANGUAGES[i % UI_LANGUAGES.length]!, { remember: false })
    expect(i18n.language).toBe(UI_LANGUAGES[29 % UI_LANGUAGES.length])
  })

  it('switching to the same language many times at once loads it only once', async () => {
    await Promise.all(Array.from({ length: 10 }, () => setLanguage('de', { remember: false })))
    expect(i18n.language).toBe('de')
    expect(i18n.hasResourceBundle('de', 'translation')).toBe(true)
  })

  it('an English-only key falls back to English in another language', async () => {
    i18n.addResource('en', 'translation', 'testOnly.fallback', 'only in English')
    await setLanguage('de', { remember: false })
    expect(i18n.t('testOnly.fallback' as never)).toBe('only in English')
    i18n.removeResourceBundle('en', 'translation')
    i18n.addResourceBundle('en', 'translation', en)
  })
})

describe('detectLanguage', () => {
  it.each([
    [['bg-BG', 'en'], 'bg'],
    [['BG'], 'bg'],
    [['de-CH'], 'de'],
    [['DE-at'], 'de'],
    [['fr-FR', 'de-DE'], 'de'],
    [['fr', 'es', 'ja'], 'en'],
    [[], 'en'],
    [[''], 'en'],
    [['xx-yy-zz', 'bg'], 'bg'],
    [['-'], 'en'],
    [['en-US'], 'en'],
  ])('browser languages %j -> %s', (languages, expected) => {
    setNavigatorLanguages(languages)
    expect(detectLanguage()).toBe(expected)
  })

  it('falls back to navigator.language when languages is missing', () => {
    setNavigatorLanguages(undefined, 'de-DE')
    expect(detectLanguage()).toBe('de')
  })

  it('does not trust a saved language that is not supported', () => {
    localStorage.setItem('cv-ui-language', 'klingon')
    setNavigatorLanguages(['bg'])
    expect(hasStoredLanguage()).toBe(false)
    expect(detectLanguage()).toBe('bg')
  })

  it('prefers the saved language over the browser', () => {
    localStorage.setItem('cv-ui-language', 'de')
    setNavigatorLanguages(['bg'])
    expect(detectLanguage()).toBe('de')
    expect(hasStoredLanguage()).toBe(true)
  })

  it('works when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    setNavigatorLanguages(['bg'])
    expect(() => detectLanguage()).not.toThrow()
    expect(detectLanguage()).toBe('bg')
    expect(hasStoredLanguage()).toBe(false)
  })

  it('setLanguage still switches when localStorage refuses to save', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    await expect(setLanguage('bg')).resolves.toBeUndefined()
    expect(i18n.language).toBe('bg')
    expect(document.documentElement.lang).toBe('bg')
  })

  it('remember: false does not write the choice', async () => {
    await setLanguage('de', { remember: false })
    expect(localStorage.getItem('cv-ui-language')).toBeNull()
  })
})
