import { LayoutDashboard, RotateCw } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { reportError } from '@/shared/lib/monitoring'
import { StatusPage } from './StatusPage'
import { BrokenPageIllustration } from '@/shared/ui/illustrations'

/** Shown instead of a blank screen when a page crashes. */
export function ErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
    reportError(error)
  }, [error])
  // A new version was deployed and an old page chunk is gone: reloading fixes it.
  const outdated =
    error instanceof Error &&
    /dynamically imported module|Importing a module script/i.test(error.message)
  return (
    <StatusPage
      illustration={<BrokenPageIllustration />}
      title={outdated ? t('nav.error.outdatedTitle') : t('nav.error.title')}
      text={outdated ? t('nav.error.outdatedText') : t('nav.error.text')}
    >
      <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
        <RotateCw className="size-4" aria-hidden />
        {t('nav.error.reload')}
      </button>
      {/* A full page load, so a broken page cannot keep the app stuck. */}
      <a href="/" className="btn btn-secondary">
        <LayoutDashboard className="size-4" aria-hidden />
        {t('nav.error.home')}
      </a>
    </StatusPage>
  )
}
