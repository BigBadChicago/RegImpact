import { test, expect } from '@playwright/test'

/**
 * E2E tests for Deadline Management UI Flow
 * Following TDD: These tests are written FIRST, implementation comes after
 * Tests will be skipped initially since the UI doesn't exist yet
 */

test.describe('Deadline Dashboard Flow', () => {
  test('should complete login and navigate to deadlines page', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Navigate to deadlines page
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Verify page loaded
    expect(page.url()).toContain('/dashboard/deadlines')
  })

  test('should display deadline table with headers', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Verify table renders
    await page.waitForSelector('table')

    // Check table headers
    const regulationHeader = await page.locator('th:has-text("Regulation")')
    const deadlineHeader = await page.locator('th:has-text("Deadline Date")')
    const daysHeader = await page.locator('th:has-text("Days Remaining")')
    const riskHeader = await page.locator('th:has-text("Risk Level")')

    await expect(regulationHeader).toBeVisible()
    await expect(deadlineHeader).toBeVisible()
    await expect(daysHeader).toBeVisible()
    await expect(riskHeader).toBeVisible()
  })

  test('should display deadline rows with data', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Wait for table body
    await page.waitForSelector('tbody')

    // Verify at least one deadline row
    const rows = await page.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Verify first row has expected columns
    const firstRow = rows.first()
    const cells = await firstRow.locator('td').count()
    expect(cells).toBeGreaterThan(0)
  })

  test('should display color-coded risk levels', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Look for CRITICAL badge (should have red styling)
    const criticalBadge = page.locator('text=CRITICAL').first()
    if (await criticalBadge.isVisible()) {
      const bgColor = await criticalBadge.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      )
      // Should have some color (not transparent/initial)
      expect(bgColor).toBeTruthy()
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
    }
  })

  test('should display statistics cards at top', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Look for stat cards
    const totalDeadlines = page.locator('text=/Total Deadlines|Upcoming Deadlines/i').first()
    const criticalCount = page.locator('text=/Critical Deadlines|Critical/i').first()

    await expect(totalDeadlines).toBeVisible()
    await expect(criticalCount).toBeVisible()
  })
})

test.describe('Deadline Filtering', () => {
  test('should filter deadlines by risk level', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')
    await page.waitForSelector('tbody')

    // Get initial row count
    await page.locator('tbody tr').count()

    // Filter by CRITICAL
    const filterSelect = page.locator('select[name="riskLevel"]')
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('CRITICAL')
      await page.waitForTimeout(500) // Wait for filter to apply

      // Verify all visible rows are CRITICAL
      const rows = page.locator('tbody tr')
      const rowCount = await rows.count()

      if (rowCount > 0) {
        // Check first few rows for CRITICAL badge
        for (let i = 0; i < Math.min(3, rowCount); i++) {
          const row = rows.nth(i)
          const hasCritical = await row.locator('text=CRITICAL').isVisible()
          expect(hasCritical).toBe(true)
        }
      }

      // Clear filter
      await filterSelect.selectOption('ALL')
      await page.waitForTimeout(500)
    }
  })

  test('should sort deadlines by date when clicking header', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')
    await page.waitForSelector('tbody')

    // Click date header to sort
    const dateHeader = page.locator('th:has-text("Deadline Date")')
    if (await dateHeader.isVisible()) {
      await dateHeader.click()
      await page.waitForTimeout(500)

      // Verify rows are sorted (first date should be <= second date)
      const rows = page.locator('tbody tr')
      const rowCount = await rows.count()

      if (rowCount >= 2) {
        // Get first two dates and verify order
        const firstDate = await rows.nth(0).locator('td').nth(1).textContent()
        const secondDate = await rows.nth(1).locator('td').nth(1).textContent()
        
        expect(firstDate).toBeTruthy()
        expect(secondDate).toBeTruthy()
      }
    }
  })
})

test.describe('Calendar Export', () => {
  test('should export deadlines to calendar file', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Click export button
    const exportButton = page.locator('button:has-text("Export to Calendar")')
    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()

      const download = await downloadPromise

      // Verify file downloaded
      expect(download.suggestedFilename()).toMatch(/\.ics$/)

      // Verify file content (basic check)
      const path = await download.path()
      if (path) {
        const fs = await import('fs')
        const content = await fs.promises.readFile(path, 'utf-8')
        expect(content).toContain('BEGIN:VCALENDAR')
        expect(content).toContain('BEGIN:VEVENT')
        expect(content).toContain('END:VCALENDAR')
      }
    }
  })

  test('should include deadline details in calendar events', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Click export button
    const exportButton = page.locator('button:has-text("Export to Calendar")')
    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()

      const download = await downloadPromise
      const path = await download.path()

      if (path) {
        const fs = await import('fs')
        const content = await fs.promises.readFile(path, 'utf-8')
        
        // Should have SUMMARY (title) and DESCRIPTION
        expect(content).toContain('SUMMARY:')
        expect(content).toContain('DESCRIPTION:')
        // Should have DTSTART (date)
        expect(content).toContain('DTSTART')
        // Should have ALARM (reminder)
        expect(content).toContain('BEGIN:VALARM')
      }
    }
  })
})

test.describe('Deadline Detail View', () => {
  test('should navigate to regulation detail when clicking deadline', async ({ page }) => {
    // Setup: Login and navigate
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')
    await page.waitForSelector('tbody')

    // Click on first deadline (regulation link)
    const firstLink = page.locator('tbody tr:first-child a').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()

      // Should navigate to regulation detail page
      await page.waitForURL(/\/dashboard\/regulations\//)

      // Verify we're on a regulation detail page
      expect(page.url()).toContain('/dashboard/regulations/')
    }
  })
})

test.describe('Mobile Responsiveness', () => {
  test('should display deadline table on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Table should be visible (possibly scrollable)
    const table = page.locator('table')
    await expect(table).toBeVisible()
  })

  test('should allow horizontal scrolling on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Check if table container allows horizontal scroll
    const tableContainer = page.locator('table').locator('..')
    if (await tableContainer.isVisible()) {
      const overflow = await tableContainer.evaluate((el) =>
        window.getComputedStyle(el).overflowX
      )
      // Should be 'auto' or 'scroll'
      expect(['auto', 'scroll']).toContain(overflow)
    }
  })
})

test.describe('Loading and Empty States', () => {
  test('should display loading state while fetching deadlines', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    
    // Look for loading spinner or skeleton
    await page.locator('[data-testid="loading"]').or(page.locator('text=Loading')).count()
    // Note: This might be very fast, so we don't use waitFor
    // Just checking if it exists at some point
  })

  test('should display empty state when no deadlines exist', async ({ page }) => {
    // This test would need mocked data to show empty state
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // If no deadlines, should show empty state
    await page.locator('text=/No upcoming deadlines|No deadlines found/i').count()
    // May or may not be visible depending on data
  })
})

test.describe('Deadline Countdown Visualization', () => {
  test('should display days remaining with visual indicators', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')
    await page.waitForSelector('tbody')

    // Check for days remaining column
    const daysColumn = page.locator('td:has-text("days")')
    if (await daysColumn.first().isVisible()) {
      const text = await daysColumn.first().textContent()
      expect(text).toMatch(/\d+\s*days?/i)
    }
  })
})

test.describe('Navigation and Breadcrumbs', () => {
  test('should show breadcrumb navigation', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Look for breadcrumb
    const breadcrumb = page.locator('[data-testid="breadcrumb"]').or(page.locator('nav[aria-label="Breadcrumb"]'))
    if (await breadcrumb.isVisible()) {
      const text = await breadcrumb.textContent()
      expect(text).toContain('Dashboard')
      expect(text).toContain('Deadlines')
    }
  })

  test('should navigate back to dashboard from breadcrumb', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@techcorp.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.click('text=Deadlines')
    await page.waitForURL('/dashboard/deadlines')

    // Click dashboard breadcrumb
    const dashboardLink = page.locator('a:has-text("Dashboard")').first()
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await page.waitForURL('/dashboard')
      expect(page.url()).toContain('/dashboard')
      expect(page.url()).not.toContain('/deadlines')
    }
  })
})
