import { test, expect, devices } from '@playwright/test'

/**
 * E2E tests for mobile responsiveness
 * STATUS: Skipped until responsive dashboard and diff UI are implemented
 */

test.describe('Mobile Dashboard', () => {
  test.skip('should render dashboard correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['iPhone SE'] })
    const page = await context.newPage()

    await page.goto('/login')
    await page.fill('input#email', 'admin@techcorp.com')
    await page.fill('input#password', 'password')
    await page.click('button[type="submit"]')

    await page.waitForURL('/dashboard')
    await page.waitForSelector('[data-testid="metric-card"]')

    const cards = await page.$$('[data-testid="metric-card"]')
    expect(cards.length).toBeGreaterThan(0)

    await page.waitForSelector('[data-testid="hamburger-menu"]')
    await page.click('[data-testid="hamburger-menu"]')
    await page.waitForSelector('[data-testid="sidebar-nav"]')
  })
})

test.describe('Mobile Diff Viewer', () => {
  test.skip('should stack split view vertically on mobile', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['iPhone SE'] })
    const page = await context.newPage()

    await page.goto('/dashboard/regulations/123')
    await page.waitForSelector('[data-testid="diff-viewer"]')

    await page.waitForSelector('[data-testid="diff-view-split"]')
    await page.waitForSelector('[data-testid="diff-column-left"]')
    await page.waitForSelector('[data-testid="diff-column-right"]')
  })
})

test.describe('Multi-viewport checks', () => {
  test.skip('should render dashboard at 375px, 768px, and 1024px', async ({ browser }) => {
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
    ]

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      await page.goto('/dashboard')
      await page.waitForTimeout(500)
      await context.close()
    }
  })
})
