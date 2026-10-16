import { useMutation } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { authApi } from '@/features/auth/api'
import { useCurrentUser } from '@/features/auth/queries'
import { errorMessage } from '@/shared/api/errorMessage'

/** Until the email is confirmed, a thin reminder under the header. */
export function VerifyBanner() {
  const { t } = useTranslation()
  const user = useCurrentUser().data
  const resend = useMutation({ mutationFn: authApi.resendVerification })
  if (!user || user.emailVerified) return null
  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
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
    </div>
  )
}
