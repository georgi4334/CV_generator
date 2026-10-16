import { Download, FileText } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { FitToWidth } from '@/shared/ui/FitToWidth'
import { EditorLoading } from '@/shared/ui/LoadStates'
import { primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { CvRenderer, LetterRenderer } from '@/renderer'
import { PAGE_SIZE_PX } from '@/renderer/templates/tokens'
import { toApiRequestError } from '@/shared/api/client'
import { errorMessage } from '@/shared/api/errorMessage'
import { useSharedDocument } from './queries'
import { printDocument } from '@/features/print/printCv'

/** Keeps shared CVs out of search results while the page is open. */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.append(meta)
    return () => meta.remove()
  }, [])
}

function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted px-4 text-center text-fg">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  )
}

/** /s/:slug: a CV or cover letter someone shared, read-only, for anyone with the link. */
export function SharedDocumentPage() {
  const { t } = useTranslation()
  const { slug = '' } = useParams()
  const query = useSharedDocument(slug)
  useNoIndex()
  useDocumentTitle(query.data?.title)

  if (query.isPending) {
    return <EditorLoading />
  }
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404) {
      return (
        <Message title={t('share.page.brokenTitle')}>
          <p className="max-w-md text-sm text-fg-muted">{t('share.page.brokenText')}</p>
          <Link to="/" className={secondaryButton}>
            {t('share.page.makeOwn')}
          </Link>
        </Message>
      )
    }
    return (
      <Message title={t('share.page.loadErrorTitle')}>
        <p className="max-w-md text-sm text-fg-muted">{errorMessage(error)}</p>
        <button type="button" onClick={() => void query.refetch()} className={primaryButton}>
          {t('common.tryAgain')}
        </button>
      </Message>
    )
  }

  const shared = query.data
  const { title } = shared
  const pageSize = shared.document.design.pageSize
  return (
    <div className="min-h-screen bg-muted-strong text-fg">
      <header className="sticky top-0 z-(--z-raised) border-b border-line-strong bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <FileText className="size-5 shrink-0 text-brand-fg" aria-hidden />
          <h1 className="min-w-0 flex-1 truncate font-semibold">{title}</h1>
          <button
            type="button"
            onClick={() =>
              printDocument(
                shared.type === 'cv'
                  ? { kind: 'cv', cv: shared.document }
                  : { kind: 'coverLetter', letter: shared.document },
                title,
              )
            }
            className={primaryButton}
            aria-label={t('share.page.downloadPdf')}
            title={t('share.page.printTitle')}
          >
            <Download className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t('share.page.downloadPdf')}</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <FitToWidth width={PAGE_SIZE_PX[pageSize].width}>
          {shared.type === 'cv' ? (
            <CvRenderer cv={shared.document} mode="preview" pageClassName="shadow-paper" />
          ) : (
            <LetterRenderer letter={shared.document} mode="preview" pageClassName="shadow-paper" />
          )}
        </FitToWidth>
      </main>
      <footer className="pb-8 text-center text-xs text-fg-muted">
        {t('share.page.madeWith')}{' '}
        <Link to="/" className="font-medium text-brand-fg hover:underline">
          CV Generator
        </Link>
      </footer>
    </div>
  )
}
