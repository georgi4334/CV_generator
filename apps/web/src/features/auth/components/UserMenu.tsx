import { LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useCurrentUser, useLogout } from '@/features/auth/queries'

/** Account link and "Sign out" in the main header. */
export function UserMenu() {
  const { t } = useTranslation()
  const user = useCurrentUser().data
  const logout = useLogout()
  const navigate = useNavigate()
  if (!user) return null
  const label = user.name || user.email
  return (
    <div className="flex items-center gap-1">
      <Link
        to="/account"
        aria-label={t('auth.accountLabel', { name: label })}
        title={t('auth.accountTitle')}
        className="flex items-center gap-1.5 rounded-tight px-2 py-1.5 text-sm text-fg-soft hover:bg-muted"
      >
        <UserRound className="size-5" aria-hidden />
        <span className="hidden max-w-32 truncate lg:inline">{label}</span>
      </Link>
      <button
        type="button"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
        }
        aria-label={t('auth.signOut')}
        title={t('auth.signOut')}
        className="rounded-tight p-2 text-fg-muted hover:bg-muted hover:text-fg"
      >
        <LogOut className="size-5" aria-hidden />
      </button>
    </div>
  )
}
