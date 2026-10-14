import { Download, FileText, LoaderCircle } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { FitToWidth } from '../../components/FitToWidth'
import { primaryButton, secondaryButton } from '../../components/PageHeader'
import { CvRenderer } from '../../cv-renderer'
import { PAGE_SIZE_PX } from '../../cv-renderer/tokens'
import { toApiRequestError } from '../../lib/api'
import { useSharedCv } from '../../lib/cvQueries'
import { printCv } from '../print/printCv'

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-center text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  )
}

/** /s/:slug: a CV someone shared, read-only, for anyone with the link. */
export function SharedCvPage() {
  const { slug = '' } = useParams()
  const query = useSharedCv(slug)
  useNoIndex()
  useDocumentTitle(query.data?.title)

  if (query.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-100 text-slate-500 dark:bg-slate-950">
        <LoaderCircle className="size-5 animate-spin" /> Loading…
      </div>
    )
  }
  if (query.isError) {
    const error = toApiRequestError(query.error)
    if (error.status === 404) {
      return (
        <Message title="This link does not work">
          <p className="max-w-md text-sm text-slate-500">
            The owner may have turned it off or replaced it with a new link. Ask them for the
            current one.
          </p>
          <Link to="/" className={secondaryButton}>
            Make your own CV
          </Link>
        </Message>
      )
    }
    return (
      <Message title="Could not load this CV">
        <p className="max-w-md text-sm text-slate-500">{error.message}</p>
        <button type="button" onClick={() => void query.refetch()} className={primaryButton}>
          Try again
        </button>
      </Message>
    )
  }

  const { title, document: cv } = query.data
  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <FileText className="size-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
          <h1 className="min-w-0 flex-1 truncate font-semibold">{title}</h1>
          <button
            type="button"
            onClick={() => printCv(cv, title)}
            className={primaryButton}
            aria-label="Download PDF"
            title="Opens the print dialog: choose “Save as PDF”"
          >
            <Download className="size-4" aria-hidden />
            <span>
              <span className="hidden sm:inline">Download </span>PDF
            </span>
          </button>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <FitToWidth width={PAGE_SIZE_PX[cv.design.pageSize].width}>
          <CvRenderer cv={cv} mode="preview" pageClassName="shadow-lg" />
        </FitToWidth>
      </main>
      <footer className="pb-8 text-center text-xs text-slate-500">
        Made with{' '}
        <Link to="/" className="font-medium text-teal-700 hover:underline dark:text-teal-300">
          CV Generator
        </Link>
      </footer>
    </div>
  )
}
