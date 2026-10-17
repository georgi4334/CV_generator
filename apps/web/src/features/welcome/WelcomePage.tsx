import { APP_NAME, createExampleCv } from '@cv/shared'
import {
  Briefcase,
  Languages,
  LayoutTemplate,
  Link2,
  Mail,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router'
import { useCurrentUser } from '@/features/auth/queries'
import { LegalFooter } from '@/features/legal/LegalLayout'
import { CvThumbnail } from '@/renderer'
import { useBreakpoint } from '@/shared/lib/useBreakpoint'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { Logo } from '@/shared/ui/Logo'
import { primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { ThemeSelect } from '@/shared/ui/ThemeSelect'

/** Width of the example CV in the hero, in pixels (the page itself is drawn at full size and scaled). */
const HERO_CV_WIDTH = 360
/** Narrower on phones, so the card and its tilt stay inside the screen. */
const HERO_CV_WIDTH_PHONE = 300

/** One example, built once: the real renderer draws it, so what visitors see is what they get. */
const EXAMPLE_CV = createExampleCv('software-developer')

const FEATURES: Array<{
  key: 'templates' | 'ai' | 'letters' | 'share' | 'jobs' | 'languages'
  icon: LucideIcon
}> = [
  { key: 'templates', icon: LayoutTemplate },
  { key: 'ai', icon: Sparkles },
  { key: 'letters', icon: Mail },
  { key: 'share', icon: Link2 },
  { key: 'jobs', icon: Briefcase },
  { key: 'languages', icon: Languages },
]

/**
 * What a first-time visitor sees: what the service does, with a way to log in
 * or register. Signed-in people go straight to their dashboard.
 */
export function WelcomePage() {
  const { t } = useTranslation()
  const user = useCurrentUser()
  // One language picker in the page (codes on phones, names from sm: up).
  const wide = useBreakpoint('sm')
  if (user.data) return <Navigate to="/" replace />

  return (
    <div className="app-backdrop flex min-h-dvh flex-col text-fg">
      <header className="page-container flex items-center justify-between gap-3 pt-3">
        <Link to="/welcome" className="glass flex h-11 items-center rounded-pill px-4">
          <Logo />
        </Link>
        <div className="glass-pill flex items-center gap-1">
          <LanguageSelect compact={!wide} />
          <ThemeSelect compact />
          <Link to="/login" className="pill-item pill-item-active">
            {t('welcome.logIn')}
          </Link>
        </div>
      </header>

      <main className="page-container flex-1">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="glass-pill inline-block px-4 py-1.5 text-sm font-medium text-fg-soft">
              {t('welcome.eyebrow')}
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {t('welcome.title')}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-fg-soft">{t('welcome.lead')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className={`${primaryButton} px-6 py-3 text-base`}>
                {t('welcome.create')}
              </Link>
              <Link to="/login" className={`${secondaryButton} px-6 py-3 text-base`}>
                {t('welcome.logIn')}
              </Link>
            </div>
            <p className="mt-4 text-sm text-fg-soft">
              {t('welcome.haveAccount')}{' '}
              <Link to="/login" className="link">
                {t('welcome.logIn')}
              </Link>
            </p>
          </div>

          <figure
            className="mx-auto w-fit"
            aria-label={t('welcome.previewLabel', { app: APP_NAME })}
          >
            <div className="glass mx-auto w-fit -rotate-2 p-3 shadow-overlay motion-reduce:rotate-0">
              <CvThumbnail cv={EXAMPLE_CV} width={wide ? HERO_CV_WIDTH : HERO_CV_WIDTH_PHONE} />
            </div>
          </figure>
        </section>

        <section aria-labelledby="welcome-features" className="py-8">
          <h2 id="welcome-features" className="text-2xl font-semibold tracking-tight">
            {t('welcome.featuresTitle')}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li key={key} className="glass p-5">
                <span className="inline-flex rounded-control bg-brand-soft p-2 text-brand-fg">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-semibold">{t(`welcome.features.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-fg-soft">{t(`welcome.features.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass my-12 flex flex-col items-center gap-4 px-6 py-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t('welcome.finalTitle')}</h2>
          <p className="max-w-lg text-fg-soft">{t('welcome.finalText')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className={`${primaryButton} px-6 py-3 text-base`}>
              {t('welcome.create')}
            </Link>
            <Link to="/login" className={`${secondaryButton} px-6 py-3 text-base`}>
              {t('welcome.logIn')}
            </Link>
          </div>
        </section>
      </main>
      <LegalFooter />
    </div>
  )
}
