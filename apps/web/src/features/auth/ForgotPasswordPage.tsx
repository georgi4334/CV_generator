import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { primaryButton } from '../../components/PageHeader'
import { toApiRequestError } from '../../lib/api'
import { authApi } from '../../lib/authApi'
import { AuthShell, FormError } from './AuthShell'
import { field, linkClass } from './authStyles'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const ask = useMutation({ mutationFn: (value: string) => authApi.forgotPassword(value) })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    ask.mutate(email)
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we will send you a link to choose a new one."
      footer={
        <Link to="/login" className={linkClass}>
          Back to sign in
        </Link>
      }
    >
      {ask.isSuccess ? (
        <p role="status" className="text-sm">
          If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It
          is valid for one hour.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </label>
          <FormError message={ask.isError ? toApiRequestError(ask.error).message : null} />
          <button
            type="submit"
            disabled={ask.isPending}
            className={`${primaryButton} w-full justify-center`}
          >
            {ask.isPending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
