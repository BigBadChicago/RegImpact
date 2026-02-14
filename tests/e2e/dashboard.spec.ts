import { test, expect } from '@playwright/test'

/**
 * E2E tests for Executive Dashboard
 * STATUS: Skipped until dashboard UI is implemented
 */

test.describe('Executive Dashboard Flow', () => {
  test.skip('should complete login and render dashboard widgets', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('/login')

    await page.fill('input#email', 'admin@techcorp.com')
    await page.fill('input#password', 'password')
    await page.click('button[type="submit"]')

    await page.waitForURL('/dashboard')
    await page.waitForSelector('[data-testid="metric-card"]')

    const cards = await page.$$('[data-testid="metric-card"]')
    expect(cards.length).toBe(4)

    await page.waitForSelector('[data-testid="upcoming-deadlines"]')
    await page.waitForSelector('[data-testid="recent-changes"]')
    await page.waitForSelector('[data-testid="sidebar-nav"]')
    await page.waitForSelector('[data-testid="user-menu"]')
  })
})

test.describe('Dashboard Logout', () => {
  test.skip('should log out and redirect to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('/login')

    await page.fill('input#email', 'admin@techcorp.com')
    await page.fill('input#password', 'password')
    await page.click('button[type="submit"]')

    await page.waitForURL('/dashboard')
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    await page.waitForURL('/login')
    await page.goto('/dashboard')
    await page.waitForURL('/login')
  })
})
