import { Briefcase, Files, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MouseEvent } from 'react'
import { matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { ApiStatus } from '@/shared/ui/ApiStatus'
import { Logo } from '@/shared/ui/Logo'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { UserMenu } from '@/features/auth/components/UserMenu'
import { LegalFooter } from '@/features/legal/LegalLayout'
import { VerifyBanner } from '@/features/auth/components/VerifyBanner'
import { NEW_CV_PATH, NEW_LETTER_PATH } from '@/shared/lib/paths'
import { useHealth } from '@/shared/api/useHealth'
import { useBreakpoint } from '@/shared/lib/useBreakpoint'
import { canTransition, isPlainClick, runViewTransition } from '@/shared/lib/viewTransitions'

const TABS: {
  to: string
  label: 'nav.dashboard' | 'nav.documents' | 'nav.savedJobs'
  icon: LucideIcon
  end: boolean
  also?: string[]
}[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, end: true },
  // "Create new CV" (/cvs/new) belongs to Documents too.
  {
    to: '/documents',
    label: 'nav.documents',
    icon: Files,
    end: false,
    also: [NEW_CV_PATH, NEW_LETTER_PATH],
  },
  { to: '/jobs', label: 'nav.savedJobs', icon: Briefcase, end: false },
]

/**
 * The app's frame. Tablets and computers: tabs in the header. Phones: a tab
 * bar at the bottom, within thumb reach, and a compact header.
 */
export function AppLayout() {
  const { t } = useTranslation()
  const health = useHealth()
  const { pathname } = useLocation()
  // One navigation in the page: header tabs from md: up, a bottom tab bar on phones.
  const wide = useBreakpoint('md')
  const active = (tab: (typeof TABS)[number], isActive: boolean) =>
    isActive || Boolean(tab.also?.includes(pathname))
  const navigate = useNavigate()
  // Tabs slide like pages of an app: towards the left when moving right, and back.
  const currentTab = TABS.findIndex((tab) =>
    active(tab, matchPath({ path: tab.to, end: tab.end }, pathname) !== null),
  )
  const switchTab = (event: MouseEvent, index: number) => {
    if (index === currentTab || !isPlainClick(event) || !canTransition()) return
    event.preventDefault()
    const tab = TABS[index]!
    runViewTransition(index > currentTab ? 'tab-forward' : 'tab-back', () =>
      navigate(tab.to, { flushSync: true }),
    )
  }

  return (
    <div className="app-backdrop flex min-h-dvh flex-col text-fg">
      {/* Always visible: it stays at the top while the page scrolls under its glass. */}
      <header className="glass-bar sticky top-0 z-(--z-nav)">
        <div className="page-container flex h-14 items-center gap-3 md:gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <Logo nameClassName="max-sm:sr-only" />
          </NavLink>

          {wide && (
            <nav aria-label={t('nav.main')} className="glass-pill flex items-center gap-0.5">
              {TABS.map((tab, index) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  onClick={(event) => switchTab(event, index)}
                  className={({ isActive }) =>
                    `pill-item ${active(tab, isActive) ? 'pill-item-active' : ''}`
                  }
                >
                  {t(tab.label)}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1 md:gap-3">
            <span className="md:hidden">
              <LanguageSelect compact />
            </span>
            <span className="hidden md:inline">
              <LanguageSelect />
            </span>
            <UserMenu />
          </div>
        </div>
      </header>
      <VerifyBanner />

      <main
        className={`page-container flex-1 py-section md:py-8 ${wide ? '' : 'clear-bottom-nav'}`}
      >
        <Outlet />
      </main>
      {/* On phones, room at the bottom so the tab bar never covers content. */}
      <div className={wide ? '' : 'clear-bottom-nav'}>
        <LegalFooter>
          <ApiStatus isLoading={health.isLoading} isError={health.isError} data={health.data} />
        </LegalFooter>
      </div>

      {!wide && (
        <nav
          aria-label={t('nav.main')}
          className="pb-safe glass-bar fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-b-0"
        >
          <ul className="grid h-bottom-nav grid-cols-3">
            {TABS.map((tab, index) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  onClick={(event) => switchTab(event, index)}
                  className={({ isActive }) =>
                    `flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                      active(tab, isActive) ? 'text-brand-fg' : 'text-fg-muted'
                    }`
                  }
                >
                  <tab.icon className="size-5" aria-hidden />
                  {t(tab.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
