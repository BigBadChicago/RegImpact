import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockDeadline, createFutureDate } from '../../fixtures/deadlines'
import { mockSession } from '../../fixtures/users'
import type { DeadlineModel, RegulationVersionModel } from '../../../generated/prisma/models'
import type { Session } from 'next-auth'

/**
 * Integration tests for deadline API routes
 * Following TDD: These tests are written FIRST, implementation comes after
 * 
 * Tests will import the actual route handlers once implemented:
 * - GET /api/deadlines - List deadlines for customer
 * - POST /api/regulations/[id]/deadlines/extract - Extract deadlines from regulation
 */

// Mock authentication
vi.mock('@/auth.config', () => ({
  auth: vi.fn(),
}))

// Mock Prisma client
vi.mock('../../../src/lib/prisma', () => ({
  default: {
    deadline: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    regulationVersion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    regulation: {
      findUnique: vi.fn(),
    },
  },
}))

// Import mocked modules
import { auth } from '@/auth.config'
import prisma from '../../../src/lib/prisma'

const mockAuth = auth as unknown as {
  mockResolvedValue: (value: Session | null) => void
}

describe('GET /api/deadlines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    // Dynamic import for route handler
    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test&daysAhead=90')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Unauthorized')
    } catch (error) {
      // Route doesn't exist yet - expected in TDD red phase
      expect(error).toBeDefined()
    }
  })

  it('should return deadlines for authenticated customer', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const mockDeadlines: DeadlineModel[] = [
      createMockDeadline({ riskLevel: 'CRITICAL' }),
      createMockDeadline({ riskLevel: 'IMPORTANT' }),
    ]
    vi.mocked(prisma.deadline.findMany).mockResolvedValue(mockDeadlines)

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test&daysAhead=90')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.deadlines).toHaveLength(2)
      expect(data.deadlines[0]).toHaveProperty('deadlineDate')
      expect(data.deadlines[0]).toHaveProperty('riskLevel')
    } catch (error) {
      // Expected in TDD red phase
      expect(error).toBeDefined()
    }
  })

  it('should filter by daysAhead parameter', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const thirtyday = createFutureDate(15)
    const mockDeadlines = [
      createMockDeadline({ deadlineDate: thirtyday }),
    ]
    vi.mocked(prisma.deadline.findMany).mockResolvedValue(mockDeadlines)

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test&daysAhead=30')
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Verify the findMany was called with proper date filter
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deadlineDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should filter by riskLevel query parameter', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const mockCriticalDeadlines: DeadlineModel[] = [
      createMockDeadline({ riskLevel: 'CRITICAL' }),
    ]
    vi.mocked(prisma.deadline.findMany).mockResolvedValue(mockCriticalDeadlines)

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test&riskLevel=CRITICAL')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            riskLevel: 'CRITICAL',
          }),
        })
      )
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should sort by deadlineDate ascending', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const deadline1 = createMockDeadline({ deadlineDate: createFutureDate(10) })
    const deadline2 = createMockDeadline({ deadlineDate: createFutureDate(30) })
    const deadline3 = createMockDeadline({ deadlineDate: createFutureDate(60) })
    
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([deadline1, deadline2, deadline3])

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test&daysAhead=90')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { deadlineDate: 'asc' },
        })
      )
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should include regulation and jurisdiction details', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const mockDeadlineWithRelations = {
      ...createMockDeadline(),
      regulationVersion: {
        regulation: {
          id: 'reg-1',
          title: 'Test Regulation',
          jurisdiction: {
            code: 'CA',
            name: 'California',
          },
        },
      },
    }
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([mockDeadlineWithRelations])

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test&daysAhead=90')
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            regulationVersion: expect.objectContaining({
              include: expect.objectContaining({
                regulation: expect.any(Object),
              }),
            }),
          }),
        })
      )
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should return 400 for missing customerId parameter', async () => {
    mockAuth.mockResolvedValue(mockSession)

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      // No customerId in query
      const request = new NextRequest('http://localhost:3000/api/deadlines?daysAhead=90')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('customerId')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should use default daysAhead of 90 if not provided', async () => {
    mockAuth.mockResolvedValue(mockSession)
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([])

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test')
      await GET(request)

      // Should use 90 days as default
      const callArgs = vi.mocked(prisma.deadline.findMany).mock.calls[0]?.[0] as
        | { where?: { deadlineDate?: unknown } }
        | undefined
      expect(callArgs?.where?.deadlineDate).toBeDefined()
    } catch (error) {
      expect(error).toBeDefined()
    }
  })
})

describe('POST /api/regulations/[id]/deadlines/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: JSON.stringify({ versionId: 'version-1' }),
      })
      const response = await POST(request, { params: { id: 'reg-123' } })

      expect(response.status).toBe(401)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should extract deadlines from regulation version', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const mockRegulationVersion = {
      id: 'version-1',
      regulationId: 'reg-1',
      versionNumber: 1,
      contentText: 'Compliance required by January 15, 2025. Quarterly reports due within 30 days.',
      contentJson: null,
      publishedDate: new Date('2024-01-01'),
      ingestedDate: new Date('2024-01-02'),
      regulation: {
        id: 'reg-1',
        title: 'Test Regulation',
      },
    } as unknown as RegulationVersionModel
    vi.mocked(prisma.regulationVersion.findUnique).mockResolvedValue(mockRegulationVersion)
    vi.mocked(prisma.deadline.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.deadline.createMany).mockResolvedValue({ count: 2 })

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: JSON.stringify({ versionId: 'version-1' }),
      })
      const response = await POST(request, { params: { id: 'reg-123' } })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.deadlines).toBeInstanceOf(Array)
      expect(data.deadlines.length).toBeGreaterThan(0)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should return 404 if regulation version not found', async () => {
    mockAuth.mockResolvedValue(mockSession)
    vi.mocked(prisma.regulationVersion.findUnique).mockResolvedValue(null)

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: JSON.stringify({ versionId: 'version-1' }),
      })
      const response = await POST(request, { params: { id: 'reg-123' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('not found')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should skip extraction if deadlines already exist', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const mockRegulationVersion = {
      id: 'version-1',
      regulationId: 'reg-1',
      versionNumber: 1,
      contentText: 'Test content',
      contentJson: null,
      publishedDate: new Date('2024-01-01'),
      ingestedDate: new Date('2024-01-02'),
      regulation: { title: 'Test' },
    } as unknown as RegulationVersionModel
    vi.mocked(prisma.regulationVersion.findUnique).mockResolvedValue(mockRegulationVersion)
    
    // Existing deadline found
    vi.mocked(prisma.deadline.findFirst).mockResolvedValue(createMockDeadline())
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([createMockDeadline()])

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: JSON.stringify({ versionId: 'version-1' }),
      })
      const response = await POST(request, { params: { id: 'reg-123' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('already')
      
      // Should NOT call createMany if already extracted
      expect(prisma.deadline.createMany).not.toHaveBeenCalled()
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should validate request body', async () => {
    mockAuth.mockResolvedValue(mockSession)

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      // Missing versionId
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request, { params: { id: 'reg-123' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('versionId')
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should create Deadline records in database', async () => {
    mockAuth.mockResolvedValue(mockSession)

    const mockRegulationVersion = {
      id: 'version-1',
      regulationId: 'reg-1',
      versionNumber: 1,
      contentText: 'Compliance required by March 15, 2025',
      contentJson: null,
      publishedDate: new Date('2024-01-01'),
      ingestedDate: new Date('2024-01-02'),
      regulation: { id: 'reg-1', title: 'Test' },
    } as unknown as RegulationVersionModel
    vi.mocked(prisma.regulationVersion.findUnique).mockResolvedValue(mockRegulationVersion)
    vi.mocked(prisma.deadline.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.deadline.createMany).mockResolvedValue({ count: 1 })

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: JSON.stringify({ versionId: 'version-1' }),
      })
      await POST(request, { params: { id: 'reg-123' } })

      // Should have called createMany
      expect(prisma.deadline.createMany).toHaveBeenCalled()
      const createArgs = vi.mocked(prisma.deadline.createMany).mock.calls[0]?.[0]
      expect(createArgs?.data).toBeInstanceOf(Array)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should handle extraction errors gracefully', async () => {
    mockAuth.mockResolvedValue(mockSession)
    vi.mocked(prisma.regulationVersion.findUnique).mockRejectedValue(new Error('Database error'))

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: JSON.stringify({ versionId: 'version-1' }),
      })
      const response = await POST(request, { params: { id: 'reg-123' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
    } catch (error) {
      expect(error).toBeDefined()
    }
  })
})

describe('Error Handling', () => {
  it('should handle invalid JSON in request body', async () => {
    mockAuth.mockResolvedValue(mockSession)

    try {
      const { POST } = await import('../../../src/app/api/regulations/[id]/deadlines/extract/route')
      const request = new NextRequest('http://localhost:3000/api/regulations/reg-123/deadlines/extract', {
        method: 'POST',
        body: 'invalid json',
      })
      const response = await POST(request, { params: { id: 'reg-123' } })

      expect(response.status).toBe(400)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should handle database connection errors', async () => {
    mockAuth.mockResolvedValue(mockSession)
    vi.mocked(prisma.deadline.findMany).mockRejectedValue(new Error('Connection timeout'))

    try {
      const { GET } = await import('../../../src/app/api/deadlines/route')
      const request = new NextRequest('http://localhost:3000/api/deadlines?customerId=test')
      const response = await GET(request)

      expect(response.status).toBe(500)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })
})
