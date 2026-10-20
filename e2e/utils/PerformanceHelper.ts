import type { Page } from '@playwright/test'

export interface WebVitals {
  /** Largest Contentful Paint, in ms; null when the browser reported none. */
  lcp: number | null
  /** Cumulative Layout Shift (a score, not ms): how much the page jumped while loading. */
  cls: number
}

/**
 * Reads the page's Largest Contentful Paint and Cumulative Layout Shift from the browser's own
 * performance entries (buffered, so it works after the page has loaded). Call it when the page is
 * showing what the user came for.
 */
export async function measureWebVitals(page: Page): Promise<WebVitals> {
  return page.evaluate(
    () =>
      new Promise<WebVitals>((resolve) => {
        let lcp: number | null = null
        let cls = 0
        const lcpObserver = new PerformanceObserver((list) => {
          const last = list.getEntries().at(-1)
          if (last) lcp = last.startTime
        })
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number
            hadRecentInput: boolean
          })[]) {
            // Shifts right after a click or key press are expected: they do not count.
            if (!entry.hadRecentInput) cls += entry.value
          }
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
        clsObserver.observe({ type: 'layout-shift', buffered: true })
        // Buffered entries arrive on the next tasks.
        setTimeout(() => {
          lcpObserver.disconnect()
          clsObserver.disconnect()
          resolve({ lcp, cls })
        }, 500)
      }),
  )
}
