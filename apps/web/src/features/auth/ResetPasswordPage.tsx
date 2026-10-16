import { PASSWORD_MIN_LENGTH } from '@cv/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { primaryButton } from '../../components/PageHeader'
import { toApiRequestError } from '../../lib/api'
import { authApi } from '../../lib/authApi'
import { resetClientState } from '../../lib/sessionState'
import { AuthShell, FormError } from './AuthShell'
import { field, linkClass } from './authStyles'

export function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? ''
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const reset = useMutation({
    mutationFn: () => authApi.resetPassword({ token, password }),
    // Resetting signs every browser out, this one included.
    onSuccess: () => resetClientState(queryClient, null),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    reset.mutate()
  }

  const toLogin = (
    <Link to="/login" className={linkClass}>
      Sign in
    </Link>
  )

  if (!token) {
    return (
      <AuthShell title="Reset link is incomplete" footer={toLogin}>
        <p className="text-sm">
          Open the link from the email again, or{' '}
          <Link to="/forgot-password" className={linkClass}>
            ask for a new one
          </Link>
          .
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" footer={reset.isSuccess ? undefined : toLogin}>
      {reset.isSuccess ? (
        <div className="space-y-4 text-sm">
          <p role="status">Your password was changed. Sign in with the new one.</p>
          <Link to="/login" className={`${primaryButton} w-full justify-center`}>
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              autoFocus
              minLength={PASSWORD_MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              At least {PASSWORD_MIN_LENGTH} characters.
            </span>
          </label>
          <FormError message={reset.isError ? toApiRequestError(reset.error).message : null} />
          {reset.isError && toApiRequestError(reset.error).code === 'invalid_token' && (
            <p className="text-sm">
              <Link to="/forgot-password" className={linkClass}>
                Ask for a new link
              </Link>
            </p>
          )}
          <button
            type="submit"
            disabled={reset.isPending}
            className={`${primaryButton} w-full justify-center`}
          >
            {reset.isPending ? 'Saving…' : 'Change password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
