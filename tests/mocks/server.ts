import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW server for Node.js environment (used in unit and integration tests)
 * This intercepts HTTP requests and returns mock responses
 * Set up in tests/setup.ts with beforeAll/afterEach/afterAll hooks
 */
export const server = setupServer(...handlers)
