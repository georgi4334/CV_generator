import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { primaryButton } from '../../components/PageHeader'
import { authApi } from '../../lib/authApi'
import { errorMessage } from '../../lib/errorMessage'
import { AuthShell, FormError } from './AuthShell'
import { field, linkClass } from './authStyles'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const ask = useMutation({ mutationFn: (value: string) => authApi.forgotPassword(value) })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    ask.mutate(email)
  }

  return (
    <AuthShell
      title={t('auth.forgot.title')}
      description={t('auth.forgot.description')}
      footer={
        <Link to="/login" className={linkClass}>
          {t('auth.forgot.back')}
        </Link>
      }
    >
      {ask.isSuccess ? (
        <p role="status" className="text-sm">
          <Trans
            i18nKey="auth.forgot.sent"
            values={{ email: email.trim() }}
            components={{ strong: <strong /> }}
          />
        </p>
      ) : (
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
          <FormError message={ask.isError ? errorMessage(ask.error) : null} />
          <button
            type="submit"
            disabled={ask.isPending}
            className={`${primaryButton} w-full justify-center`}
          >
            {ask.isPending ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
