import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageSelect } from '@/shared/ui/LanguageSelect'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { card } from '@/shared/ui/PageHeader'
import { LegalFooter } from '@/features/legal/LegalLayout'

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <LanguageSelect />
        <ThemeToggle />
      </div>
      <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
        <FileText className="size-6 text-teal-600 dark:text-teal-400" /> {t('common.appName')}
      </Link>
      <main className={`${card} w-full max-w-sm p-6`}>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
        <div className="mt-5">{children}</div>
      </main>
      {footer && <p className="text-sm text-slate-600 dark:text-slate-300">{footer}</p>}
      <LegalFooter />
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  )
}
