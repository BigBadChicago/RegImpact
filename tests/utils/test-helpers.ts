import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * Test utilities and helpers for consistent testing patterns
 */

/**
 * Render component with required providers (SessionProvider, etc.)
 * @param ui - React component to render
 * @param options - Additional render options
 * @returns render result from @testing-library/react
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  // For now, simple render since providers aren't heavily used
  // Can be extended to include SessionProvider, QueryProvider, etc.
  return render(ui, options)
}

/**
 * Create a mock Prisma client for testing database operations
 * @returns Mocked Prisma client with stubbed methods
 */
export function mockPrismaClient() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    regulation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    regulationVersion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    policyDiff: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    deadline: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }
}

/**
 * Wait for loading states to disappear
 * @param timeout - Maximum time to wait (default 3000ms)
 */
export async function waitForLoadingToFinish(timeout = 3000) {
  const { waitFor } = await import('@testing-library/dom')
  return waitFor(
    () => {
      const loadingElements = document.querySelectorAll(
        '[data-testid="loading"], .skeleton, [aria-busy="true"]'
      )
      if (loadingElements.length > 0) {
        throw new Error('Still loading')
      }
    },
    { timeout }
  )
}

/**
 * Create a mock API response
 * @param data - Response data
 * @param status - HTTP status code (default 200)
 * @returns Mock fetch Response
 */
export function createMockApiResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Setup mock Next.js router
 * @param pathname - Initial pathname (default '/')
 * @returns Mock router object
 */
export function setupMockRouter(pathname = '/') {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
    route: pathname,
    pathname,
    query: {},
    asPath: pathname,
    isReady: true,
    isLocal: false,
    isPreview: false,
    isFallback: false,
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }

  return mockRouter
}

/**
 * Helper to wait for an element to appear in the DOM
 * Useful for async operations and API calls
 */
export async function waitForElement(selector: string, timeout = 3000) {
  const { waitFor } = await import('@testing-library/dom')
  return waitFor(
    () => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`Element not found: ${selector}`)
      return element
    },
    { timeout }
  )
}
