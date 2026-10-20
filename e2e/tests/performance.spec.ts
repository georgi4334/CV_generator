import budgets from '../data/performanceBudgets.json' with { type: 'json' }
import { expect, test } from '../fixtures'
import { measureWebVitals } from '../utils/PerformanceHelper'

// Timing depends on the machine, so this runs in one browser (the desktop one) only.
test.describe('page load budgets', () => {
  for (const { name, path } of budgets.pages) {
    test(`the ${name} paints quickly and does not jump`, async ({ publicPage, page }, testInfo) => {
      await publicPage.open(path)
      const { lcp, cls } = await measureWebVitals(page)

      // The numbers go into the HTML report next to the test.
      testInfo.annotations.push(
        { type: 'LCP', description: lcp === null ? 'not reported' : `${Math.round(lcp)} ms` },
        { type: 'CLS', description: cls.toFixed(3) },
      )

      expect(lcp, 'the browser reported a Largest Contentful Paint').not.toBeNull()
      expect(lcp!, 'Largest Contentful Paint (ms)').toBeLessThan(budgets.lcpMs)
      expect(cls, 'Cumulative Layout Shift').toBeLessThan(budgets.cls)
    })
  }
})
