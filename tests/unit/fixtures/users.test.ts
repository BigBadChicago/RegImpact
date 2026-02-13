import { describe, it, expect } from 'vitest'
import { mockAdminUser, mockRegularUser, mockSession, createMockSession, mockCustomer, createMockCustomer } from '../../fixtures/users'

/**
 * Test suite for mock fixtures
 * Ensures test data is properly structured for use throughout test suite
 */

describe('User Fixtures', () => {
  describe('mockAdminUser', () => {
    it('should have all required user properties', () => {
      expect(mockAdminUser).toHaveProperty('id', 'user-admin-1')
      expect(mockAdminUser).toHaveProperty('email', 'admin@techcorp.com')
      expect(mockAdminUser).toHaveProperty('name', 'Admin User')
      expect(mockAdminUser).toHaveProperty('role', 'ADMIN')
      expect(mockAdminUser).toHaveProperty('customerId', mockCustomer.id)
    })

    it('should have bcrypt password hash', () => {
      expect(mockAdminUser.password).toContain('$2a$')
    })
  })

  describe('mockRegularUser', () => {
    it('should have all required user properties', () => {
      expect(mockRegularUser).toHaveProperty('id', 'user-regular-1')
      expect(mockRegularUser).toHaveProperty('email', 'user@techcorp.com')
      expect(mockRegularUser).toHaveProperty('name', 'Regular User')
      expect(mockRegularUser).toHaveProperty('role', 'USER')
    })

    it('should belong to same customer as admin user', () => {
      expect(mockRegularUser.customerId).toBe(mockAdminUser.customerId)
    })
  })

  describe('mockCustomer', () => {
    it('should have all required customer properties', () => {
      expect(mockCustomer).toHaveProperty('id', 'customer-1')
      expect(mockCustomer).toHaveProperty('name', 'TechCorp Inc')
      expect(mockCustomer).toHaveProperty('email', 'admin@techcorp.com')
      expect(mockCustomer).toHaveProperty('employeeCount', 250)
      expect(mockCustomer).toHaveProperty('subscriptionTier', 'GROWTH')
    })
  })

  describe('mockSession', () => {
    it('should have valid session structure', () => {
      expect(mockSession).toHaveProperty('user')
      expect(mockSession).toHaveProperty('expires')
      expect(mockSession.user).toHaveProperty('id')
      expect(mockSession.user).toHaveProperty('email')
      expect(mockSession.user).toHaveProperty('role')
      expect(mockSession.user).toHaveProperty('customerId')
    })

    it('should have future expiration date', () => {
      const expirationTime = new Date(mockSession.expires).getTime()
      const now = Date.now()

      expect(expirationTime).toBeGreaterThan(now)
    })

    it('should contain admin user data', () => {
      expect(mockSession.user?.id).toBe(mockAdminUser.id)
      expect(mockSession.user?.email).toBe(mockAdminUser.email)
      expect(mockSession.user?.role).toBe(mockAdminUser.role)
    })
  })

  describe('createMockSession helper', () => {
    it('should create session with default values', () => {
      const session = createMockSession()

      expect(session).toHaveProperty('user')
      expect(session).toHaveProperty('expires')
    })

    it('should allow overriding session properties', () => {
      const customSession = createMockSession({
        user: {
          ...mockSession.user,
          role: 'USER',
        },
      })

      expect(customSession.user?.role).toBe('USER')
    })

    it('should preserve non-overridden properties', () => {
      const customSession = createMockSession({
        user: mockSession.user,
      })

      expect(customSession.expires).toBe(mockSession.expires)
    })
  })

  describe('createMockCustomer helper', () => {
    it('should create customer with default values', () => {
      const customer = createMockCustomer()

      expect(customer).toHaveProperty('id')
      expect(customer).toHaveProperty('name', 'TechCorp Inc')
    })

    it('should allow overriding customer properties', () => {
      const largeCompany = createMockCustomer({ employeeCount: 1000 })

      expect(largeCompany.employeeCount).toBe(1000)
    })

    it('should preserve non-overridden properties', () => {
      const customCustomer = createMockCustomer({ name: 'NewCorp' })

      expect(customCustomer.name).toBe('NewCorp')
      expect(customCustomer.subscriptionTier).toBe('GROWTH')
    })
  })
})
