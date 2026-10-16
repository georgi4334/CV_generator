import { PASSWORD_MIN_LENGTH } from '@cv/shared'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { primaryButton } from '../../components/PageHeader'
import { toApiRequestError } from '../../lib/api'
import { useCurrentUser, useRegister } from '../../lib/authQueries'
import { AuthShell, FormError } from './AuthShell'
import { field, linkClass, safeNext } from './authStyles'

export function RegisterPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const current = useCurrentUser().data
  const register = useRegister()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (current && !register.isPending) return <Navigate to={next} replace />

  const submit = (event: FormEvent) => {
    event.preventDefault()
    register.mutate(
      { name, email, password },
      { onSuccess: () => navigate(next, { replace: true }) },
    )
  }

  return (
    <AuthShell
      title="Create your account"
      description="Free: up to 20 CVs and 30 versions each."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={linkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Name (optional)</span>
          <input
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            At least {PASSWORD_MIN_LENGTH} characters. A few short words work well.
          </span>
        </label>
        <FormError message={register.isError ? toApiRequestError(register.error).message : null} />
        <button
          type="submit"
          disabled={register.isPending}
          className={`${primaryButton} w-full justify-center`}
        >
          {register.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
