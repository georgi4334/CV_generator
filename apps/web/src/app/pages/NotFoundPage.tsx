import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page text-fg">
      <h1 className="text-2xl font-semibold">{t('nav.notFound.title')}</h1>
      <Link to="/" className="text-brand-fg hover:underline">
        {t('nav.notFound.back')}
      </Link>
    </div>
  )
}
