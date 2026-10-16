import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-2xl font-semibold">{t('nav.notFound.title')}</h1>
      <Link to="/" className="text-teal-700 hover:underline dark:text-teal-300">
        {t('nav.notFound.back')}
      </Link>
    </div>
  )
}
