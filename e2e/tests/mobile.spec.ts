import { expect, test } from '../fixtures'

test('app pages fit a phone screen and use the bottom navigation', async ({
  page,
  account,
  dashboard,
  jobs,
}) => {
  void account
  for (const path of ['/', '/documents/all', '/jobs', '/cvs/new']) {
    await dashboard.open(path)
    await dashboard.expectNoSideScroll()
    await dashboard.expectAccessible()
  }

  // The account drawer fits the phone, opens its views and closes again.
  await dashboard.account.open()
  await dashboard.account.openSettings()
  await expect(dashboard.account.dialog('Account settings')).toBeVisible()
  await dashboard.expectNoSideScroll()
  await dashboard.expectAccessible()
  await dashboard.account.close()
  await expect(dashboard.account.dialog()).toHaveCount(0)

  // One main navigation, at the bottom of the screen.
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav).toHaveCount(1)
  await nav.getByRole('link', { name: 'Saved Jobs' }).click()
  await jobs.expectUrl(/\/jobs$/)
})

test('the editor uses a bottom toolbar and opens tools as a sheet', async ({ page, cvEditor }) => {
  await cvEditor.expectNoSideScroll()

  await cvEditor.editorTools().getByRole('button', { name: 'Design & Font' }).click()
  await expect(cvEditor.designFont.panel()).toBeVisible()
  await cvEditor.expectNoSideScroll()
  await cvEditor.expectAccessible()

  await cvEditor.designFont.close()

  await cvEditor.openMoreMenu()
  await expect(page.getByRole('menuitem', { name: /Download PDF/ })).toBeVisible()
  // The menu opens over the page and holds the theme.
  await cvEditor.setTheme('Dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
})
