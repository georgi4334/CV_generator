import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'
import { PageLoading } from '@/shared/ui/LoadStates'
import { usePrintJob } from '@/features/print/printCv'
import { preloadPages } from '@/shared/lib/lazyPage'
import { PrintHost } from '@/app/lazyPages'

/** How long after the first page loads to start fetching the others (soon, so tabs open at once). */
const PRELOAD_DELAY_MS = 300

/** Wraps every page; holds what all pages share, like printing. */
export function RootLayout() {
  const printing = usePrintJob((s) => s.job !== null)

  useEffect(() => {
    // Fetch the other pages in the background, so moving around is instant.
    const id = setTimeout(() => void preloadPages(), PRELOAD_DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
      {/* Its own boundary: loading the printer must never blank the page. */}
      <Suspense fallback={null}>{printing && <PrintHost />}</Suspense>
    </>
  )
}
