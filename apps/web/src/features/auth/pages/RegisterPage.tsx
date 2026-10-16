import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@cv/shared'
import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { primaryButton } from '@/shared/ui/PageHeader'
import { useCurrentUser, useRegister } from '@/features/auth/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { AuthShell, FormError } from '@/features/auth/components/AuthShell'
import { field, linkClass, safeNext } from '@/features/auth/components/authStyles'

export function RegisterPage() {
  const { t } = useTranslation()
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
      title={t('auth.register.title')}
      description={t('auth.register.description')}
      footer={
        <>
          {t('auth.register.haveAccount')}{' '}
          <Link to="/login" className={linkClass}>
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('auth.register.nameOptional')}</span>
          <input
            autoComplete="name"
            maxLength={NAME_MAX_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('auth.email')}</span>
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
          <span className="font-medium">{t('auth.password')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <span className="block text-xs text-fg-muted">
            {t('auth.register.passwordHint', { min: PASSWORD_MIN_LENGTH })}
          </span>
        </label>
        <FormError message={register.isError ? errorMessage(register.error) : null} />
        <p className="text-xs text-fg-muted">
          <Trans
            i18nKey="auth.register.consent"
            components={{
              terms: <Link to="/terms" className={linkClass} />,
              privacy: <Link to="/privacy" className={linkClass} />,
            }}
          />
        </p>
        <button
          type="submit"
          disabled={register.isPending}
          className={`${primaryButton} w-full justify-center`}
        >
          {register.isPending ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>
    </AuthShell>
  )
}
