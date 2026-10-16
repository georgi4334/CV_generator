import type { User } from '@cv/shared'
import type { QueryClient } from '@tanstack/react-query'
import { hasStoredLanguage, i18n, setLanguage } from '../i18n'
import { isUiLanguage } from '../i18n/languages'
import { authApi } from './authApi'
import { authKeys } from './authKeys'

/**
 * Keeps the account's language and the interface language together:
 * - choosing a language while signed in saves it on the account (emails use it);
 * - signing in on a browser without its own choice switches to the account's language.
 */
export function startLocaleSync(queryClient: QueryClient) {
  const signedIn = () => queryClient.getQueryData<User | null>(authKeys.me) ?? null

  const onLanguageChanged = (language: string) => {
    const user = signedIn()
    if (!user || !isUiLanguage(language) || user.locale === language) return
    authApi
      .setLocale(language)
      .then((updated) => queryClient.setQueryData(authKeys.me, updated))
      .catch(() => {
        // Not important enough to bother the user; it is saved next time.
      })
  }
  i18n.on('languageChanged', onLanguageChanged)

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== authKeys.me[0]) return
    const user = event.query.state.data as User | null | undefined
    if (!user || user.locale === i18n.language) return
    if (!hasStoredLanguage()) void setLanguage(user.locale, { remember: false })
    // This browser has its own choice: the account follows it.
    else onLanguageChanged(i18n.language)
  })

  return () => {
    i18n.off('languageChanged', onLanguageChanged)
    unsubscribe()
  }
}
