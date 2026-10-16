import { ChevronDown, LogOut, Settings, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useCurrentUser, useLogout } from '@/features/auth/queries'
import { Modal } from '@/shared/ui/Modal'

/** First letters of the name (or of the email), shown in the round avatar. */
function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return email.charAt(0).toUpperCase()
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

function Avatar({ text, large = false }: { text: string; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-pill bg-brand-soft font-semibold text-brand-fg-strong ${
        large ? 'size-12 text-base' : 'size-8 text-xs'
      }`}
    >
      {text}
    </span>
  )
}

/**
 * The signed-in person in the main header: their avatar opens a drawer from
 * the right with their name and email, the account settings and "Sign out".
 */
export function UserMenu() {
  const { t } = useTranslation()
  const user = useCurrentUser().data
  const logout = useLogout()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const headingId = useId()
  if (!user) return null
  const label = user.name || user.email
  const avatar = initials(user.name, user.email)
  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        title={t('auth.menu')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-pill p-0.5 text-sm text-fg-soft hover:bg-muted lg:pr-2"
      >
        <Avatar text={avatar} />
        {/* The name is always in the button's accessible name, visible from lg: up. */}
        <span className="sr-only lg:not-sr-only lg:max-w-32 lg:truncate">
          <span className="sr-only">{t('auth.accountTitle')}: </span>
          {label}
        </span>
        <ChevronDown className="hidden size-3.5 text-fg-muted lg:inline" aria-hidden />
      </button>

      {open && (
        <Modal labelledBy={headingId} onClose={close} variant="side">
          <div className="flex h-full flex-col">
            <div className="flex items-start gap-3 border-b border-line p-card">
              <Avatar text={avatar} large />
              <div className="min-w-0 flex-1 pt-1">
                <h2 id={headingId} className="truncate font-semibold">
                  {label}
                </h2>
                {user.name && <p className="truncate text-sm text-fg-muted">{user.email}</p>}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={t('common.close')}
                className="btn-icon"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <nav aria-label={t('auth.menu')} className="flex-1 p-2">
              <Link
                to="/account"
                onClick={close}
                className="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm hover:bg-muted"
              >
                <Settings className="size-4 text-fg-muted" aria-hidden />
                {t('auth.accountSettings')}
              </Link>
            </nav>

            <div className="pb-safe border-t border-line p-card">
              <button
                type="button"
                disabled={logout.isPending}
                onClick={() =>
                  logout.mutate(undefined, {
                    onSettled: () => navigate('/login', { replace: true }),
                  })
                }
                className="btn btn-secondary w-full"
              >
                <LogOut className="size-4" aria-hidden />
                {t('auth.signOut')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
