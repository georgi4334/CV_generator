import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { primaryButton } from '../../components/PageHeader'
import { toApiRequestError } from '../../lib/api'
import { useCurrentUser, useLogin } from '../../lib/authQueries'
import { AuthShell, FormError } from './AuthShell'
import { field, linkClass, safeNext } from './authStyles'

export function LoginPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const current = useCurrentUser().data
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (current && !login.isPending) return <Navigate to={next} replace />

  const submit = (event: FormEvent) => {
    event.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate(next, { replace: true }) })
  }

  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          No account yet?{' '}
          <Link
            to={`/register${params.has('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
            className={linkClass}
          >
            Create one
          </Link>
        </>
      }
    >
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
        <label className="block space-y-1 text-sm">
          <span className="flex justify-between font-medium">
            Password
            <Link to="/forgot-password" className={`${linkClass} font-normal`}>
              Forgot password?
            </Link>
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </label>
        <FormError message={login.isError ? toApiRequestError(login.error).message : null} />
        <button
          type="submit"
          disabled={login.isPending}
          className={`${primaryButton} w-full justify-center`}
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
