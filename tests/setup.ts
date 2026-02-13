import React from 'react'
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'
import { server } from './mocks/server'

// Setup environment variables for tests
process.env.DATABASE_URL =
  'postgresql://postgres:testpass@localhost:5433/regimpact_test'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET =
  'test-secret-key-32-characters-long-minimum'
process.env.OPENAI_API_KEY = 'sk-test-mock-key'

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

// Suppress expected console errors in tests
const originalError = console.error
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
