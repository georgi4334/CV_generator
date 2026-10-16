import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@cv/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { authApi } from '@/features/auth/api'
import { useCurrentUser, useUpdateProfile } from '@/features/auth/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { resetClientState } from '@/features/auth/sessionState'
import { FormError } from '@/features/auth/components/AuthShell'
import { field } from '@/features/auth/components/authStyles'

function ProfileForm({ name: initial, email }: { name: string; email: string }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial)
  const update = useUpdateProfile()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate(name)
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-labelledby="profile-heading">
      <h3 id="profile-heading" className="font-semibold">
        {t('account.profile.title')}
      </h3>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t('account.profile.name')}</span>
        <input
          maxLength={NAME_MAX_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t('account.profile.email')}</span>
        <input value={email} readOnly disabled className={`${field} opacity-70`} />
      </label>
      <FormError message={update.isError ? errorMessage(update.error) : null} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={update.isPending} className={primaryButton}>
          {t('common.save')}
        </button>
        {update.isSuccess && (
          <span role="status" className="text-sm text-fg-muted">
            {t('common.saved')}
          </span>
        )}
      </div>
    </form>
  )
}

function PasswordForm() {
  const { t } = useTranslation()
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew] = useState('')
  const change = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrent('')
      setNew('')
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    change.mutate()
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-labelledby="password-heading">
      <h3 id="password-heading" className="font-semibold">
        {t('account.password.title')}
      </h3>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t('account.password.current')}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          className={field}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t('account.password.new')}</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={field}
        />
        <span className="block text-xs text-fg-muted">{t('account.password.hint')}</span>
      </label>
      <FormError message={change.isError ? errorMessage(change.error) : null} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={change.isPending} className={primaryButton}>
          {t('account.password.submit')}
        </button>
        {change.isSuccess && (
          <span role="status" className="text-sm text-fg-muted">
            {t('account.password.changed')}
          </span>
        )}
      </div>
    </form>
  )
}

function DeleteAccount() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const remove = useMutation({
    mutationFn: () => authApi.deleteAccount(password),
    onSuccess: () => {
      resetClientState(queryClient, null)
      navigate('/register', { replace: true })
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    remove.mutate()
  }
  return (
    <section
      className="space-y-3 rounded-card border border-danger-line p-4"
      aria-labelledby="delete-heading"
    >
      <h3 id="delete-heading" className="font-semibold text-danger-fg">
        {t('account.delete.title')}
      </h3>
      <p className="text-sm text-fg-soft">{t('account.delete.text')}</p>
      {open ? (
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('account.delete.confirmPassword')}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </label>
          <FormError message={remove.isError ? errorMessage(remove.error) : null} />
          <div className="flex gap-2">
            <button type="submit" disabled={remove.isPending} className="btn btn-danger">
              {t('account.delete.submit')}
            </button>
            <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={secondaryButton} onClick={() => setOpen(true)}>
          {t('account.delete.open')}
        </button>
      )}
    </section>
  )
}

/** Profile, password and deleting the account, shown in the account drawer. */
export function AccountSettings() {
  const user = useCurrentUser().data
  if (!user) return null
  return (
    <div className="space-y-8">
      {/* key: a different user (after signing in elsewhere) starts with fresh fields. */}
      <ProfileForm key={user.id} name={user.name} email={user.email} />
      <PasswordForm />
      <DeleteAccount />
    </div>
  )
}
