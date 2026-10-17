import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { StatusPage } from './StatusPage'

/** A broken link, a mistyped address or a document that no longer exists. */
export function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // "Go back" only when there is a page of this app to go back to: the first
  // page of a visit has the key "default".
  const canGoBack = useLocation().key !== 'default'
  return (
    <StatusPage code="404" title={t('nav.notFound.title')} text={t('nav.notFound.text')}>
      <Link to="/" className="btn btn-primary">
        <LayoutDashboard className="size-4" aria-hidden />
        {t('nav.notFound.home')}
      </Link>
      {canGoBack && (
        <button type="button" onClick={() => void navigate(-1)} className="btn btn-secondary">
          <ArrowLeft className="size-4" aria-hidden />
          {t('nav.notFound.goBack')}
        </button>
      )}
    </StatusPage>
  )
}
