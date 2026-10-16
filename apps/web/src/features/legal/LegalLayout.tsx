import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'

/** A readable page for the privacy policy and the terms. */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-page text-fg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <FileText className="size-5 text-brand-fg" aria-hidden /> CV Generator
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="space-y-4 text-sm leading-6 text-fg-soft [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc">
          <h1 className="text-2xl font-semibold text-fg">{title}</h1>
          <p className="text-xs text-fg-muted">{t('nav.lastUpdated', { date: updated })}</p>
          {children}
        </article>
      </main>
      <LegalFooter />
    </div>
  )
}

/** Links shown at the bottom of public pages and the app. */
export function LegalFooter() {
  const { t } = useTranslation()
  return (
    <footer className="py-6 text-center text-xs text-fg-muted">
      <Link to="/privacy" className="hover:underline">
        {t('nav.privacy')}
      </Link>
      <span aria-hidden> · </span>
      <Link to="/terms" className="hover:underline">
        {t('nav.terms')}
      </Link>
    </footer>
  )
}
