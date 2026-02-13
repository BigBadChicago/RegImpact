import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * MSW worker for browser environment (used in manual browser testing)
 * Not required for automated tests, but useful for development
 */
export const worker = setupWorker(...handlers)
