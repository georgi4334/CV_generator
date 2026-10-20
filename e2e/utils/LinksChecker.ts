import type { Page } from '@playwright/test'

/**
 * Collects the links of the page that are worth following: the same-site ones. Anchors (`#...`),
 * `mailto:`/`tel:` and other sites are left out, relative addresses are made absolute, and every
 * address appears once.
 */
export async function internalLinks(page: Page): Promise<string[]> {
  const hrefs = await page
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  const here = new URL(page.url())
  const found = new Set<string>()
  for (const href of hrefs) {
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/.test(href)) continue
    const url = new URL(href, here)
    if (url.origin !== here.origin) continue
    url.hash = ''
    found.add(url.href)
  }
  return [...found]
}
