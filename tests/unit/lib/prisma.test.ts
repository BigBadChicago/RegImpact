import { describe, it, expect } from 'vitest'

/**
 * Test suite for Prisma client setup
 * Verifies singleton pattern and proper initialization
 */

describe('Prisma Client', () => {
  it('should import successfully', async () => {
    const { prisma } = await import('@/lib/prisma')
    expect(prisma).toBeDefined()
  })

  it('should have consistent interface', async () => {
    const { prisma } = await import('@/lib/prisma')

    // Check common Prisma methods
    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
    expect(typeof prisma.$transaction).toBe('function')
    expect(typeof prisma.$queryRaw).toBe('function')
  })

  describe('Model access', () => {
    it('should have user model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.user).toBeDefined()
    })

    it('should have customer model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.customer).toBeDefined()
    })

    it('should have regulation model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.regulation).toBeDefined()
    })

    it('should have regulationVersion model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.regulationVersion).toBeDefined()
    })

    it('should have policyDiff model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.policyDiff).toBeDefined()
    })

    it('should have deadline model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.deadline).toBeDefined()
    })

    it('should have jurisdiction model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.jurisdiction).toBeDefined()
    })

    it('should have costEstimate model', async () => {
      const { prisma } = await import('@/lib/prisma')
      expect(prisma.costEstimate).toBeDefined()
    })
  })

  describe('Model operations', () => {
    it('should have CRUD operations on models', async () => {
      const { prisma } = await import('@/lib/prisma')

      // Check that models have standard methods
      const methods = ['findUnique', 'findMany', 'create', 'update', 'delete']

      methods.forEach((method) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(typeof (prisma.user as any)[method]).toBe('function')
      })
    })

    it('should have aggregate operations', async () => {
      const { prisma } = await import('@/lib/prisma')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (prisma.user as any).aggregate).toBe('function')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (prisma.regulation as any).count).toBe('function')
    })
  })
})
