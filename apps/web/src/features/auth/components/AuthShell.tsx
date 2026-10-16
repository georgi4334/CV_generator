import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { ThemeSelect } from '@/shared/ui/ThemeSelect'
import { card } from '@/shared/ui/PageHeader'
import { LegalFooter } from '@/features/legal/LegalLayout'
import { Logo } from '@/shared/ui/Logo'

/** The centered card around sign-in, sign-up and password pages. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-page px-4 py-10 text-fg">
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <LanguageSelect />
        <ThemeSelect />
      </div>
      <Link to="/" className="flex flex-col items-center gap-1 text-center">
        <Logo />
        <span className="text-sm text-fg-muted">{t('common.tagline')}</span>
      </Link>
      <main className={`${card} w-full max-w-sm p-6`}>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        <div className="mt-5">{children}</div>
      </main>
      {footer && <p className="text-sm text-fg-soft">{footer}</p>}
      <LegalFooter />
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-danger-fg">
      {message}
    </p>
  )
}
