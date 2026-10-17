import { useMutation } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { authApi } from '@/features/auth/api'
import { useCurrentUser } from '@/features/auth/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { useHealth } from '@/shared/api/useHealth'

/** Until the email is confirmed, a thin reminder under the header. */
export function VerifyBanner() {
  const { t } = useTranslation()
  const user = useCurrentUser().data
  const resend = useMutation({ mutationFn: authApi.resendVerification })
  // Without an email service (local setup) nobody receives the link: say where it is.
  const emailOff = useHealth().data?.email === 'log'
  if (!user || user.emailVerified) return null
  return (
    <div
      role="status"
      className="border-b border-warning-line bg-warning-soft px-4 py-2 text-center text-sm text-warning-fg"
    >
      <Trans
        i18nKey="auth.verify.banner"
        values={{ email: user.email }}
        components={{ strong: <strong /> }}
      />{' '}
      {resend.isSuccess ? (
        t('auth.verify.resent')
      ) : (
        <button
          type="button"
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
          className="font-medium underline disabled:opacity-60"
        >
          {t('auth.verify.resend')}
        </button>
      )}
      {resend.isError && <span role="alert"> {errorMessage(resend.error)}</span>}
      {emailOff && <span className="block text-xs">{t('auth.verify.notSent')}</span>}
    </div>
  )
}
