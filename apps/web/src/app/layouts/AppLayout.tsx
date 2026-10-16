import { Briefcase, FileText, Files, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
import { ApiStatus } from '@/shared/ui/ApiStatus'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { UserMenu } from '@/features/auth/components/UserMenu'
import { LegalFooter } from '@/features/legal/LegalLayout'
import { VerifyBanner } from '@/features/auth/components/VerifyBanner'
import { NEW_CV_PATH, NEW_LETTER_PATH } from '@/shared/lib/paths'
import { useHealth } from '@/shared/api/useHealth'
import { useBreakpoint } from '@/shared/lib/useBreakpoint'

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

  return (
    <div className="flex min-h-dvh flex-col bg-page text-fg">
      <header className="border-b border-line bg-surface">
        <div className="page-container flex h-14 items-center gap-3 md:gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <FileText className="size-5 text-brand-fg" aria-hidden />
            <span className="max-sm:sr-only">{t('common.appName')}</span>
          </NavLink>

          {wide && (
            <nav aria-label={t('nav.main')} className="flex h-full items-stretch gap-1">
              {TABS.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                      active(tab, isActive)
                        ? 'border-brand-line text-brand-fg'
                        : 'border-transparent text-fg-muted hover:text-fg'
                    }`
                  }
                >
                  {t(tab.label)}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1 md:gap-3">
            <span className="hidden lg:inline">
              <ApiStatus isLoading={health.isLoading} isError={health.isError} data={health.data} />
            </span>
            <span className="md:hidden">
              <LanguageSelect compact />
            </span>
            <span className="hidden md:inline">
              <LanguageSelect />
            </span>
            <ThemeToggle />
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
        <LegalFooter />
      </div>

      {!wide && (
        <nav
          aria-label={t('nav.main')}
          className="pb-safe fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-line bg-surface"
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
