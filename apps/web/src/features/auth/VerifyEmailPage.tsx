import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { authApi } from '../../lib/authApi'
import { authKeys } from '../../lib/authKeys'
import { errorMessage } from '../../lib/errorMessage'
import { AuthShell } from './AuthShell'
import { linkClass } from './authStyles'

/** /verify-email?token=: the link in the confirmation email. */
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const token = useSearchParams()[0].get('token') ?? ''
  const queryClient = useQueryClient()
  // A query (not an effect): the link is single-use, and React runs effects twice in development.
  const verify = useQuery({
    queryKey: ['verify-email', token],
    queryFn: async () => {
      await authApi.verifyEmail(token)
      await queryClient.invalidateQueries({ queryKey: authKeys.me })
      return true
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  })

  return (
    <AuthShell
      title={t('auth.verify.title')}
      footer={
        <Link to="/" className={linkClass}>
          {t('auth.verify.goToApp')}
        </Link>
      }
    >
      <p role="status" className="text-sm">
        {!token
          ? t('auth.verify.incomplete')
          : verify.isPending
            ? t('auth.verify.confirming')
            : verify.isError
              ? t('auth.verify.failed', { message: errorMessage(verify.error) })
              : t('auth.verify.done')}
      </p>
    </AuthShell>
  )
}
