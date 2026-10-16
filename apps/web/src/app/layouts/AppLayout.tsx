import { FileText } from 'lucide-react'
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

const TABS: {
  to: string
  label: 'nav.dashboard' | 'nav.documents' | 'nav.savedJobs'
  end: boolean
  also?: string[]
}[] = [
  { to: '/', label: 'nav.dashboard', end: true },
  // "Create new CV" (/cvs/new) belongs to Documents too.
  { to: '/documents', label: 'nav.documents', end: false, also: [NEW_CV_PATH, NEW_LETTER_PATH] },
  { to: '/jobs', label: 'nav.savedJobs', end: false },
]

export function AppLayout() {
  const { t } = useTranslation()
  const health = useHealth()
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <FileText className="size-5 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">{t('common.appName')}</span>
          </NavLink>

          <nav aria-label={t('nav.main')} className="flex h-full items-stretch gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                    isActive || tab.also?.includes(pathname)
                      ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-300'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`
                }
              >
                {t(tab.label)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline">
              <ApiStatus isLoading={health.isLoading} isError={health.isError} data={health.data} />
            </span>
            <LanguageSelect />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <VerifyBanner />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <LegalFooter />
    </div>
  )
}
