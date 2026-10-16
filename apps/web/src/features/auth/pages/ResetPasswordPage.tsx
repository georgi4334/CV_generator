import { PASSWORD_MIN_LENGTH } from '@cv/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { primaryButton } from '@/shared/ui/PageHeader'
import { toApiRequestError } from '@/shared/api/client'
import { authApi } from '@/features/auth/api'
import { errorMessage } from '@/shared/api/errorMessage'
import { resetClientState } from '@/features/auth/sessionState'
import { AuthShell, FormError } from '@/features/auth/components/AuthShell'
import { field, linkClass } from '@/features/auth/components/authStyles'

export function ResetPasswordPage() {
  const { t } = useTranslation()
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
      {t('auth.signIn')}
    </Link>
  )

  if (!token) {
    return (
      <AuthShell title={t('auth.reset.incompleteTitle')} footer={toLogin}>
        <p className="text-sm">
          <Trans
            i18nKey="auth.reset.incompleteText"
            components={{ link: <Link to="/forgot-password" className={linkClass} /> }}
          />
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('auth.reset.title')} footer={reset.isSuccess ? undefined : toLogin}>
      {reset.isSuccess ? (
        <div className="space-y-4 text-sm">
          <p role="status">{t('auth.reset.done')}</p>
          <Link to="/login" className={`${primaryButton} w-full justify-center`}>
            {t('auth.signIn')}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('auth.newPassword')}</span>
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
              {t('auth.reset.hint', { min: PASSWORD_MIN_LENGTH })}
            </span>
          </label>
          <FormError message={reset.isError ? errorMessage(reset.error) : null} />
          {reset.isError && toApiRequestError(reset.error).code === 'invalid_token' && (
            <p className="text-sm">
              <Link to="/forgot-password" className={linkClass}>
                {t('auth.reset.askNew')}
              </Link>
            </p>
          )}
          <button
            type="submit"
            disabled={reset.isPending}
            className={`${primaryButton} w-full justify-center`}
          >
            {reset.isPending ? t('auth.reset.submitting') : t('auth.reset.submit')}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
