import { Session } from 'next-auth'
import type { UserRole, SubscriptionTier } from '../../generated/prisma/client'

/**
 * Mock test users and customers for testing auth flows
 * These are used throughout the test suite to simulate authenticated users
 */

/**
 * Mock customer - TechCorp Inc with 250 employees
 */
export const mockCustomer = {
  id: 'customer-1',
  name: 'TechCorp Inc',
  email: 'admin@techcorp.com',
  employeeCount: 250,
  subscriptionTier: 'GROWTH' as SubscriptionTier,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

/**
 * Mock admin user
 */
export const mockAdminUser = {
  id: 'user-admin-1',
  email: 'admin@techcorp.com',
  emailVerified: null,
  name: 'Admin User',
  password: '$2a$10$...',
  role: 'ADMIN' as UserRole,
  customerId: mockCustomer.id,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

/**
 * Mock regular user
 */
export const mockRegularUser = {
  id: 'user-regular-1',
  email: 'user@techcorp.com',
  emailVerified: null,
  name: 'Regular User',
  password: '$2a$10$...',
  role: 'USER' as UserRole,
  customerId: mockCustomer.id,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

/**
 * Mock NextAuth session with admin user
 */
export const mockSession: Session = {
  user: {
    id: mockAdminUser.id,
    email: mockAdminUser.email,
    name: mockAdminUser.name,
    role: mockAdminUser.role,
    customerId: mockAdminUser.customerId,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

/**
 * Helper: Create mock session with custom overrides
 * @example
 * const session = createMockSession({ role: 'USER' })
 */
export function createMockSession(overrides?: Partial<Session>) {
  return {
    ...mockSession,
    ...overrides,
  }
}

/**
 * Helper: Create mock customer with custom overrides
 * @example
 * const customer = createMockCustomer({ employeeCount: 500 })
 */
export function createMockCustomer(
  overrides?: Partial<typeof mockCustomer>
) {
  return {
    ...mockCustomer,
    ...overrides,
  }
}
