import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n, setLanguage } from '@/i18n'
import { TEST_USER } from '@/test/fakeAuthApi'
import { authKeys } from '@/shared/api/authKeys'
import { startLocaleSync } from './localeSync'

const setLocale = vi.hoisted(() => vi.fn())
vi.mock('./api', () => ({ authApi: { setLocale } }))

let queryClient: QueryClient
let stop: () => void

beforeEach(async () => {
  localStorage.clear()
  await setLanguage('en', { remember: false })
  setLocale.mockReset()
  setLocale.mockImplementation(async (locale: string) => ({ ...TEST_USER, locale }))
  queryClient = new QueryClient()
  stop = startLocaleSync(queryClient)
})
afterEach(() => stop())

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('account language', () => {
  it('is saved when a signed-in user switches the interface language', async () => {
    queryClient.setQueryData(authKeys.me, TEST_USER)
    await setLanguage('de')
    await flush()
    expect(setLocale).toHaveBeenCalledWith('de')
    expect(queryClient.getQueryData<{ locale: string }>(authKeys.me)?.locale).toBe('de')
  })

  it('is not sent while signed out', async () => {
    queryClient.setQueryData(authKeys.me, null)
    await setLanguage('bg')
    await flush()
    expect(setLocale).not.toHaveBeenCalled()
  })

  it('becomes the interface language on a browser without its own choice', async () => {
    queryClient.setQueryData(authKeys.me, { ...TEST_USER, locale: 'bg' })
    await flush()
    expect(i18n.language).toBe('bg')
    expect(setLocale).not.toHaveBeenCalled()
  })

  it('follows the browser when it has its own choice', async () => {
    await setLanguage('de')
    queryClient.setQueryData(authKeys.me, { ...TEST_USER, locale: 'bg' })
    await flush()
    expect(i18n.language).toBe('de')
    expect(setLocale).toHaveBeenCalledWith('de')
  })
})
