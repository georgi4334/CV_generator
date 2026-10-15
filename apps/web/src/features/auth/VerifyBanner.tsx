import { useMutation } from '@tanstack/react-query'
import { toApiRequestError } from '../../lib/api'
import { authApi } from '../../lib/authApi'
import { useCurrentUser } from '../../lib/authQueries'

/** Until the email is confirmed, a thin reminder under the header. */
export function VerifyBanner() {
  const user = useCurrentUser().data
  const resend = useMutation({ mutationFn: authApi.resendVerification })
  if (!user || user.emailVerified) return null
  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      Please confirm your email address: we sent a link to <strong>{user.email}</strong>.{' '}
      {resend.isSuccess ? (
        'A new link is on its way.'
      ) : (
        <button
          type="button"
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
          className="font-medium underline disabled:opacity-60"
        >
          Send it again
        </button>
      )}
      {resend.isError && <span role="alert"> {toApiRequestError(resend.error).message}</span>}
    </div>
  )
}
