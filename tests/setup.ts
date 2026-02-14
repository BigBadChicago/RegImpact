import React from 'react'
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'
import { server } from './mocks/server'
import { config } from 'dotenv'
import path from 'path'

// Load test environment variables from .env.test
// Falls back to existing env vars if .env.test is not found
config({ path: path.resolve(process.cwd(), '.env.test') })

// Ensure required env vars have defaults for test environment
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:testpass@localhost:5433/regimpact_test'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  'test-secret-minimum-32-characters-long-for-jwt'
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-mock-key'

// Start MSW server for mocking external API calls
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset MSW handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Clean up MSW after all tests
afterAll(() => {
  server.close()
})

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    beforePopState: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/navigation for App Router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string
    alt: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }) => {
    return React.createElement('img', { src, alt, ...props })
  },
}))

/**
 * Suppress *known* noisy console.error messages in tests while still surfacing
 * unexpected React warnings and runtime errors.
 */
const originalError = console.error

// Messages that are expected and safe to ignore in test output.
// If you add to this list, prefer matching the *full* message.
const SUPPRESSED_ERROR_PREFIXES = [
  'Warning: ReactDOM.render is no longer supported in React 18.',
  'Not implemented: HTMLFormElement.prototype.submit',
  'Warning: An update to',
]

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    const firstArg = args[0]
    const message = typeof firstArg === 'string' ? firstArg : ''

    const shouldSuppress = SUPPRESSED_ERROR_PREFIXES.some((prefix) =>
      message.startsWith(prefix),
    )

    if (shouldSuppress) {
      // Still surface suppressed errors in debug logs so they are visible
      // during development / CI without polluting normal test output.
      // eslint-disable-next-line no-console
      console.debug('[tests] suppressed console.error:', ...args)
      return
    }

    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
