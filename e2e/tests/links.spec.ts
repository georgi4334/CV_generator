import { expect, test } from '../fixtures'
import { internalLinks } from '../utils/LinksChecker'

const PUBLIC_PAGES = ['/welcome', '/login', '/register', '/forgot-password', '/privacy', '/terms']

for (const path of PUBLIC_PAGES) {
  test(`every link on ${path} leads somewhere that works`, async ({
    publicPage,
    page,
  }, testInfo) => {
    await publicPage.open(path)
    const links = await internalLinks(page)
    expect(links.length, 'a page with no links to follow').toBeGreaterThan(0)

    // The checked links go into the report, so a reviewer can see what was covered.
    await testInfo.attach('checked-links.txt', { body: links.join('\n') })

    for (const link of links) {
      const response = await page.request.get(link)
      // Soft: every broken link is listed, not only the first.
      expect.soft(response.ok(), `${link} answered ${response.status()}`).toBe(true)
    }
  })
}
