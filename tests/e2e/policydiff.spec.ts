import { test, expect } from '@playwright/test'

/**
 * E2E tests for PolicyDiff flow
 * STATUS: Skipped until regulations UI and diff workflow are implemented
 */

test.describe('Regulation Comparison Flow', () => {
  test.skip('should generate policy diff between two versions', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input#email', 'admin@techcorp.com')
    await page.fill('input#password', 'password')
    await page.click('button[type="submit"]')

    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/regulations')

    await page.click('[data-testid="regulation-item"]:first-child')
    await page.waitForURL(/\/dashboard\/regulations\/.+/)

    await page.waitForSelector('[data-testid="version-selector-previous"]')
    await page.waitForSelector('[data-testid="version-selector-current"]')

    await page.selectOption('[data-testid="version-selector-previous"]', '1')
    await page.selectOption('[data-testid="version-selector-current"]', '2')

    await page.click('button:has-text("Compare Versions")')
    await page.waitForSelector('[data-testid="diff-viewer"]', { timeout: 10000 })

    await page.waitForSelector('[data-testid="executive-summary"]')
    await page.waitForSelector('[data-testid="key-changes"]')
    await page.waitForSelector('[data-testid="significance-badge"]')

    const diffText = await page.textContent('[data-testid="diff-viewer"]')
    expect(diffText).toContain('5 days of paid sick leave')
  })
})

test.describe('Toggle Diff View', () => {
  test.skip('should switch between unified and split views', async ({ page }) => {
    await page.goto('/dashboard/regulations/123')

    await page.click('[data-testid="view-toggle-unified"]')
    await page.waitForSelector('[data-testid="diff-view-unified"]')

    await page.click('[data-testid="view-toggle-split"]')
    await page.waitForSelector('[data-testid="diff-view-split"]')
  })
})
