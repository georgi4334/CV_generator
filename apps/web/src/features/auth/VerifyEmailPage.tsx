import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { toApiRequestError } from '../../lib/api'
import { authApi } from '../../lib/authApi'
import { authKeys } from '../../lib/authKeys'
import { AuthShell } from './AuthShell'
import { linkClass } from './authStyles'

/** /verify-email?token=: the link in the confirmation email. */
export function VerifyEmailPage() {
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
      title="Confirm your email"
      footer={
        <Link to="/" className={linkClass}>
          Go to the app
        </Link>
      }
    >
      <p role="status" className="text-sm">
        {!token
          ? 'This link is incomplete. Open the link from the email again.'
          : verify.isPending
            ? 'Confirming…'
            : verify.isError
              ? `${toApiRequestError(verify.error).message}. Sign in and request a new link from the banner at the top.`
              : 'Your email address is confirmed. Thank you!'}
      </p>
    </AuthShell>
  )
}
