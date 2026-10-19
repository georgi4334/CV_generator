import { MAIN_CONTENT_ID, SkipLink } from '@/shared/ui/SkipLink'
import { Briefcase, Files, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Suspense, useState } from 'react'
import { matchPath, NavLink, Outlet, useLocation } from 'react-router'
import { ApiStatus } from '@/shared/ui/ApiStatus'
import { Logo } from '@/shared/ui/Logo'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { UserMenu } from '@/features/auth/components/UserMenu'
import { LegalFooter } from '@/features/legal/LegalLayout'
import { VerifyReminder } from '@/features/auth/components/VerifyReminder'
import { NEW_CV_PATH, NEW_LETTER_PATH, NEW_RESIGNATION_PATH } from '@/shared/lib/paths'
import { useHealth } from '@/shared/api/useHealth'
import { useBreakpoint } from '@/shared/lib/useBreakpoint'
import { PageContentLoading } from '@/shared/ui/LoadStates'
import { TabPill, type Tab } from './TabPill'

const TABS: (Tab & { icon: LucideIcon; also?: string[] })[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, end: true },
  // "Create new CV" (/cvs/new) belongs to Documents too.
  {
    to: '/documents',
    label: 'nav.documents',
    icon: Files,
    end: false,
    also: [NEW_CV_PATH, NEW_LETTER_PATH, NEW_RESIGNATION_PATH],
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
  const currentTab = TABS.findIndex((tab) =>
    active(tab, matchPath({ path: tab.to, end: tab.end }, pathname) !== null),
  )
  // The new tab's page eases in from the side you moved towards; nothing waits
  // or freezes, so it feels like one app.
  const [shown, setShown] = useState({ tab: currentTab, from: '' })
  if (shown.tab !== currentTab) {
    setShown({ tab: currentTab, from: currentTab > shown.tab ? 'right' : 'left' })
  }
  const enter =
    shown.from === 'right'
      ? 'animate-page-from-right'
      : shown.from === 'left'
        ? 'animate-page-from-left'
        : ''

  return (
    <div className="app-backdrop flex min-h-dvh flex-col text-fg">
      <SkipLink />
      {/* Always visible: it stays at the top while the page scrolls under it. */}
      <header className={`sticky top-0 z-(--z-nav) ${wide ? 'pointer-events-none' : 'glass-bar'}`}>
        {wide ? (
          // Floating glass pills, like the editor's top bar: the logo, the tabs, the account.
          <div className="page-container grid grid-cols-[1fr_auto_1fr] items-center gap-3 pt-3 pb-1 *:pointer-events-auto">
            <NavLink to="/" className="glass flex h-11 w-fit items-center rounded-pill px-4">
              <Logo />
            </NavLink>
            <TabPill tabs={TABS} current={currentTab} />
            <div className="flex justify-end">
              <div className="glass-pill flex items-center gap-1">
                <LanguageSelect />
                <UserMenu />
              </div>
            </div>
          </div>
        ) : (
          <div className="page-container flex h-14 items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2 font-semibold">
              <Logo nameClassName="max-sm:sr-only" />
            </NavLink>
            <div className="ml-auto flex items-center gap-1">
              <LanguageSelect compact />
              <UserMenu />
            </div>
          </div>
        )}
      </header>
      <VerifyReminder />

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className={`page-container flex-1 py-section outline-none md:py-8 ${wide ? '' : 'clear-bottom-nav'}`}
      >
        <div key={currentTab} className={`motion-reduce:animate-none ${enter}`}>
          {/* Its own boundary: a page still loading shows a skeleton here, not a blank app. */}
          <Suspense fallback={<PageContentLoading />}>
            <Outlet />
          </Suspense>
        </div>
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
          data-bottom-bar
          className="pb-safe glass-bar fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-b-0"
        >
          <ul className="grid h-bottom-nav grid-cols-3">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
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
