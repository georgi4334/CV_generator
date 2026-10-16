import { PASSWORD_MIN_LENGTH } from '@cv/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { card, PageHeader, primaryButton, secondaryButton } from '../../components/PageHeader'
import { toApiRequestError } from '../../lib/api'
import { authApi } from '../../lib/authApi'
import { useCurrentUser, useUpdateProfile } from '../../lib/authQueries'
import { resetClientState } from '../../lib/sessionState'
import { FormError } from './AuthShell'
import { field } from './authStyles'

function ProfileForm({ name: initial, email }: { name: string; email: string }) {
  const [name, setName] = useState(initial)
  const update = useUpdateProfile()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate(name)
  }
  return (
    <form onSubmit={submit} className={`${card} space-y-4 p-5`} aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="font-semibold">
        Profile
      </h2>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Name</span>
        <input
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <input value={email} readOnly disabled className={`${field} opacity-70`} />
      </label>
      <FormError message={update.isError ? toApiRequestError(update.error).message : null} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={update.isPending} className={primaryButton}>
          Save
        </button>
        {update.isSuccess && (
          <span role="status" className="text-sm text-slate-500">
            Saved
          </span>
        )}
      </div>
    </form>
  )
}

function PasswordForm() {
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
    <form onSubmit={submit} className={`${card} space-y-4 p-5`} aria-labelledby="password-heading">
      <h2 id="password-heading" className="font-semibold">
        Change password
      </h2>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Current password</span>
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
        <span className="font-medium">New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={field}
        />
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          Other browsers where you are signed in will be signed out.
        </span>
      </label>
      <FormError message={change.isError ? toApiRequestError(change.error).message : null} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={change.isPending} className={primaryButton}>
          Change password
        </button>
        {change.isSuccess && (
          <span role="status" className="text-sm text-slate-500">
            Password changed
          </span>
        )}
      </div>
    </form>
  )
}

function DeleteAccount() {
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
      className={`${card} space-y-3 border-red-200 p-5 dark:border-red-900`}
      aria-labelledby="delete-heading"
    >
      <h2 id="delete-heading" className="font-semibold text-red-700 dark:text-red-400">
        Delete account
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Deletes your account with all CVs, cover letters, saved jobs, uploaded images and share
        links. This cannot be undone.
      </p>
      {open ? (
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Enter your password to confirm</span>
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
          <FormError message={remove.isError ? toApiRequestError(remove.error).message : null} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={remove.isPending}
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              Delete my account
            </button>
            <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={secondaryButton} onClick={() => setOpen(true)}>
          Delete account…
        </button>
      )}
    </section>
  )
}

/** /account: profile, password and deleting the account. */
export function AccountPage() {
  const user = useCurrentUser().data
  if (!user) return null
  return (
    <>
      <PageHeader title="Account" description={`Signed in as ${user.email}.`} />
      <div className="grid max-w-xl gap-6">
        {/* key: a different user (after signing in elsewhere) starts with fresh fields. */}
        <ProfileForm key={user.id} name={user.name} email={user.email} />
        <PasswordForm />
        <DeleteAccount />
      </div>
    </>
  )
}
