import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { authApi } from '@/features/auth/api'
import { useCurrentUser } from '@/features/auth/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { useHealth } from '@/shared/api/useHealth'
import { removeToast, showToast } from '@/shared/stores/toasts'

const TOAST_ID = 'verify-email'
/** Closed with ✕: not shown again until the next visit (browser session). */
const DISMISSED_KEY = 'cv-verify-dismissed'

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}
const rememberDismissed = () => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Private mode: it just comes back on the next page.
  }
}

/** The reminder's content: which address, "Send it again", and how it went. */
function VerifyMessage() {
  const { t } = useTranslation()
  const user = useCurrentUser().data
  const resend = useMutation({ mutationFn: authApi.resendVerification })
  // Without an email service (local setup) nobody receives the link: say where it is.
  const emailOff = useHealth().data?.email === 'log'
  if (!user) return null
  return (
    <div className="space-y-1">
      <p>
        <Trans
          i18nKey="auth.verify.banner"
          values={{ email: user.email }}
          components={{ strong: <strong className="break-words" /> }}
        />
      </p>
      {resend.isSuccess ? (
        <p className="text-fg-soft">{t('auth.verify.resent')}</p>
      ) : (
        <button
          type="button"
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
          className="link font-medium disabled:opacity-60"
        >
          {t('auth.verify.resend')}
        </button>
      )}
      {resend.isError && (
        <p role="alert" className="text-danger-fg">
          {errorMessage(resend.error)}
        </p>
      )}
      {emailOff && <p className="text-xs text-fg-soft">{t('auth.verify.notSent')}</p>}
    </div>
  )
}

/** Until the email is confirmed, a warning toast in the corner that can be closed. */
export function VerifyReminder() {
  const user = useCurrentUser().data
  const unverified = Boolean(user && !user.emailVerified)

  useEffect(() => {
    if (!unverified || wasDismissed()) return
    showToast({
      id: TOAST_ID,
      tone: 'warning',
      message: <VerifyMessage />,
      onDismiss: rememberDismissed,
    })
    return () => removeToast(TOAST_ID)
  }, [unverified])

  return null
}
