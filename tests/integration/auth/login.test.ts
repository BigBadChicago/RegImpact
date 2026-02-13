import { describe, it } from 'vitest'

/**
 * Integration tests for authentication (credentials + session)
 * IMPLEMENTATION LOCATION: src/auth.config.ts
 * STATUS: Skeleton tests - marked as .todo() until implementation is created
 */

describe('Authentication Integration', () => {
  describe('Login flow', () => {
    it.todo('should authenticate valid credentials')
    it.todo('should return user with role and customerId')
    it.todo('should reject invalid password')
    it.todo('should reject non-existent user')
    it.todo('should return 401 for authentication failure')
  })

  describe('Session creation', () => {
    it.todo('should include userId in JWT')
    it.todo('should include role in session')
    it.todo('should include customerId in session')
  })

  describe('Protected routes', () => {
    it.todo('should redirect to /login if no session')
    it.todo('should allow access if authenticated')
  })
})
