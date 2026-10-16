import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'
import { PageLoading } from '../features/editor/LoadStates'
import { usePrintJob } from '../features/print/printCv'
import { preloadPages } from '../lib/lazyPage'
import { PrintHost } from '../pages/lazyPages'

/** Wraps every page; holds what all pages share, like printing. */
export function RootLayout() {
  const printing = usePrintJob((s) => s.job !== null)

  useEffect(() => {
    // Fetch the other pages in the background, so moving around is instant.
    const id = setTimeout(() => void preloadPages(), 1500)
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
