import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { addDays } from 'date-fns'
import { generateAlertsForCustomer, generateAlertsForAllCustomers } from '@/lib/alerts/generator'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    deadline: { findMany: vi.fn() },
    costEstimate: { findMany: vi.fn() },
    approval: { findMany: vi.fn() },
    alert: { create: vi.fn(), upsert: vi.fn() },
    customer: { findMany: vi.fn() },
    activity: { findMany: vi.fn() },
    $transaction: vi.fn()
  }
}))

describe('generateAlertsForCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect approaching deadlines', async () => {
    const thirtyDaysFromNow = addDays(new Date(), 25)
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([
      {
        id: 'deadline-1',
        description: 'Submit report',
        deadlineDate: thirtyDaysFromNow,
        deadlineType: 'SUBMISSION',
        regulationVersion: { regulation: { id: 'reg-1', title: 'Test Reg' } }
      }
    ] as any)
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    vi.mocked(prisma.approval.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.alert.create).mockResolvedValue({} as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}] as any)

    await generateAlertsForCustomer('customer-1')
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('should detect high cost regulations', async () => {
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([])
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([
      {
        id: 'est-1',
        oneTimeCostLow: 80000,
        oneTimeCostHigh: 120000,
        recurringCostAnnual: 20000,
        regulationVersion: { regulation: { id: 'reg-1', title: 'Expensive Reg' } },
        approvals: []
      }
    ] as any)
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.approval.findMany).mockResolvedValue([])
    vi.mocked(prisma.alert.create).mockResolvedValue({} as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}] as any)

    await generateAlertsForCustomer('customer-1')
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('should detect approval bottlenecks', async () => {
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([
      {
        regulationVersion: { regulation: { id: 'reg-1', title: 'Test' } },
        approvals: Array(6).fill({ id: 'approval-1' })
      }
    ] as any)
    vi.mocked(prisma.approval.findMany).mockResolvedValue(Array(6).fill({
      id: 'approval-1',
      costEstimate: { regulationVersion: { regulation: { id: 'reg-1', title: 'Test' } } }
    }))
    vi.mocked(prisma.alert.create).mockResolvedValue({} as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}] as any)

    await generateAlertsForCustomer('customer-1')
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('should handle no alerts gracefully', async () => {
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([])
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.approval.findMany).mockResolvedValue([])

    const result = await generateAlertsForCustomer('customer-1')
    expect(result.created).toBe(0)
  })

  it('should batch upsert alerts', async () => {
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([
      { id: '1', description: 'D1', deadlineDate: addDays(new Date(), 20), deadlineType: 'SUBMISSION', regulationVersion: { regulation: { id: 'r1', title: 'R1' } } },
      { id: '2', description: 'D2', deadlineDate: addDays(new Date(), 25), deadlineType: 'SUBMISSION', regulationVersion: { regulation: { id: 'r2', title: 'R2' } } }
    ] as any)
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    vi.mocked(prisma.approval.findMany).mockResolvedValue([])
    vi.mocked(prisma.alert.create).mockResolvedValue({} as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any)

    await generateAlertsForCustomer('customer-1')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe('generateAlertsForAllCustomers', () => {
  it('should process all customers', async () => {
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: 'cust-1' },
      { id: 'cust-2' }
    ] as any)
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    vi.mocked(prisma.approval.findMany).mockResolvedValue([])

    const result = await generateAlertsForAllCustomers()
    expect(result.customersProcessed).toBe(2)
  })

  it('should aggregate alert counts', async () => {
    vi.mocked(prisma.customer.findMany).mockResolvedValue([{ id: 'cust-1' }] as any)
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([
      { id: '1', description: 'D1', deadlineDate: addDays(new Date(), 5), deadlineType: 'SUBMISSION', regulationVersion: { regulation: { id: 'r1', title: 'R1' } } }
    ] as any)
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    vi.mocked(prisma.approval.findMany).mockResolvedValue([])
    vi.mocked(prisma.alert.create).mockResolvedValue({} as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}] as any)

    const result = await generateAlertsForAllCustomers()
    expect(result.totalAlertsCreated).toBeGreaterThan(0)
  })
})
