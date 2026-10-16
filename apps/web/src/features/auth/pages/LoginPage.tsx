import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { primaryButton } from '@/shared/ui/PageHeader'
import { useCurrentUser, useLogin } from '@/features/auth/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { AuthShell, FormError } from '@/features/auth/components/AuthShell'
import { field, linkClass, safeNext } from '@/features/auth/components/authStyles'

export function LoginPage() {
  const { t } = useTranslation()
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
      title={t('auth.signIn')}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link
            to={`/register${params.has('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
            className={linkClass}
          >
            {t('auth.login.createOne')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('auth.email')}</span>
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
            {t('auth.password')}
            <Link to="/forgot-password" className={`${linkClass} font-normal`}>
              {t('auth.login.forgot')}
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
        <FormError message={login.isError ? errorMessage(login.error) : null} />
        <button
          type="submit"
          disabled={login.isPending}
          className={`${primaryButton} w-full justify-center`}
        >
          {login.isPending ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
    </AuthShell>
  )
}
