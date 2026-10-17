import { Check, ChevronDown, ChevronLeft, ChevronRight, LogOut, Settings, X } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { useCurrentUser, useLogout } from '@/features/auth/queries'
import { AccountSettings } from './AccountSettings'
import { Modal } from '@/shared/ui/Modal'
import { useModalClose } from '@/shared/ui/useModalClose'
import { THEME_MODES } from '@/shared/ui/themeModes'
import { useThemeStore } from '@/shared/stores/theme'

/** What the drawer shows: its menu, or one of the views it opens. */
type View = 'menu' | 'account' | 'theme'

/** `?menu=account` (or `theme`) opens the drawer on that view, e.g. from an old /account link. */
const MENU_PARAM = 'menu'
const isView = (value: string | null): value is View =>
  value === 'menu' || value === 'account' || value === 'theme'

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

/** A row of the drawer's menu that opens a view. */
function MenuRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm hover:bg-glass-hover"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {value && <span className="text-fg-muted">{value}</span>}
      <ChevronRight className="size-4 text-fg-faint" aria-hidden />
    </button>
  )
}

/** System, Light or Dark, as a list of choices. */
function ThemeOptions() {
  const { t } = useTranslation()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  return (
    <fieldset className="space-y-1">
      <legend className="sr-only">{t('common.theme.label')}</legend>
      {THEME_MODES.map(({ mode: option, icon: Icon }) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm hover:bg-glass-hover has-checked:bg-brand-soft has-checked:text-brand-fg-strong has-focus-visible:outline-2 has-focus-visible:outline-brand-line"
        >
          <input
            type="radio"
            name="theme"
            value={option}
            checked={option === mode}
            onChange={() => setMode(option)}
            className="sr-only"
          />
          <Icon className="size-4" aria-hidden />
          <span className="flex-1">{t(`common.theme.${option}`)}</span>
          {option === mode && <Check className="size-4 text-brand-fg" aria-hidden />}
        </label>
      ))}
    </fieldset>
  )
}

/**
 * The signed-in person in the main header: their avatar opens a drawer from
 * the right. Its menu leads to account settings and the theme, each opened
 * inside the drawer with a back button; "Sign out" stays at the bottom.
 */
export function UserMenu() {
  const { t } = useTranslation()
  const user = useCurrentUser().data
  const logout = useLogout()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requested = params.get(MENU_PARAM)
  const [view, setView] = useState<View | null>(null)
  // Open on the requested view whenever the address asks for one (the header
  // stays mounted, e.g. while /account redirects here).
  const [handled, setHandled] = useState<string | null>(null)
  if (requested !== handled) {
    setHandled(requested)
    if (isView(requested)) setView(requested)
  }
  const themeMode = useThemeStore((s) => s.mode)
  const headingId = useId()

  // The drawer is open now; take the request out of the address.
  useEffect(() => {
    if (requested === null) return
    setParams(
      (current) => {
        current.delete(MENU_PARAM)
        return current
      },
      { replace: true },
    )
  }, [requested, setParams])

  // The drawer slides back out to the right before it goes.
  const { closing, requestClose, closed } = useModalClose(() => setView(null))

  if (!user) return null
  const label = user.name || user.email
  const avatar = initials(user.name, user.email)
  const ThemeIcon = THEME_MODES.find((m) => m.mode === themeMode)?.icon ?? Settings
  const titles = { account: t('auth.accountSettings'), theme: t('common.theme.label') }

  return (
    <>
      <button
        type="button"
        title={t('auth.menu')}
        aria-haspopup="dialog"
        aria-expanded={view !== null}
        onClick={() => setView('menu')}
        className="flex items-center gap-2 rounded-pill p-0.5 text-sm text-fg-soft hover:bg-glass-hover lg:pr-2"
      >
        <Avatar text={avatar} />
        {/* The name is always in the button's accessible name, visible from lg: up. */}
        <span className="sr-only lg:not-sr-only lg:max-w-32 lg:truncate">
          <span className="sr-only">{t('auth.accountTitle')}: </span>
          {label}
        </span>
        <ChevronDown className="hidden size-3.5 text-fg-muted lg:inline" aria-hidden />
      </button>

      {view && (
        <Modal
          labelledBy={headingId}
          onClose={closed}
          onCloseRequest={requestClose}
          closing={closing}
          variant="side"
        >
          <div className="flex h-full flex-col">
            {view === 'menu' ? (
              <>
                <div className="flex items-start gap-3 border-b border-line p-card">
                  <Avatar text={avatar} large />
                  <div className="min-w-0 flex-1 pt-1">
                    <h2 id={headingId} className="truncate font-semibold">
                      {label}
                    </h2>
                    {user.name && <p className="truncate text-sm text-fg-muted">{user.email}</p>}
                  </div>
                  <CloseButton onClick={requestClose} />
                </div>
                <nav aria-label={t('auth.menu')} className="flex-1 space-y-1 p-2">
                  <MenuRow
                    icon={<Settings className="size-4 text-fg-muted" aria-hidden />}
                    label={t('auth.accountSettings')}
                    onClick={() => setView('account')}
                  />
                  <MenuRow
                    icon={<ThemeIcon className="size-4 text-fg-muted" aria-hidden />}
                    label={t('common.theme.label')}
                    value={t(`common.theme.${themeMode}`)}
                    onClick={() => setView('theme')}
                  />
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
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-line px-2 py-3">
                  <button
                    type="button"
                    // Keyboard users land on "Back" when the view opens.
                    autoFocus
                    onClick={() => setView('menu')}
                    aria-label={t('common.back')}
                    className="btn-icon"
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <h2 id={headingId} className="min-w-0 flex-1 truncate font-semibold">
                    {titles[view]}
                  </h2>
                  <CloseButton onClick={requestClose} />
                </div>
                <div
                  key={view}
                  className="pb-safe flex-1 animate-view-in overflow-y-auto p-card motion-reduce:animate-none"
                >
                  {view === 'account' ? <AccountSettings /> : <ThemeOptions />}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" onClick={onClick} aria-label={t('common.close')} className="btn-icon">
      <X className="size-5" aria-hidden />
    </button>
  )
}
