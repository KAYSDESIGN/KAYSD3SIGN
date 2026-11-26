import { test, expect } from '@playwright/test'

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not support offline service-worker emulation')
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('navigation')).toBeVisible()
  const glb = await page.evaluate(async () => (await fetch('models/cb125r-jc91.glb')).status)
  expect(glb).toBe(200)
})
