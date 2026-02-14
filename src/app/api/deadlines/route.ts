import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import prisma from '@/lib/prisma'
import { calculateDaysRemaining } from '@/lib/deadline-extractor'
import type { DeadlineListResponse, DeadlineWithDaysRemaining, RiskLevel } from '@/types/deadline'
import type { Prisma } from '../../../../generated/prisma/client'

/**
 * GET /api/deadlines
 * 
 * Retrieve deadlines for a customer, filtered by various parameters
 * 
 * Query Parameters:
 * - customerId: (required) Customer ID to filter by
 * - daysAhead: Number of days to look ahead (default: 90)
 * - riskLevel: Filter by CRITICAL, IMPORTANT, or ROUTINE
 * - jurisdictionCode: Filter by jurisdiction (e.g., "CA", "FED")
 * 
 * @returns DeadlineListResponse with deadlines and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId')
    const daysAhead = parseInt(searchParams.get('daysAhead') || '90')
    const riskLevel = searchParams.get('riskLevel')
    const jurisdictionCode = searchParams.get('jurisdictionCode')

    // Validate required parameters
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId parameter is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    // Build where clause
    const regulationVersionFilter: Prisma.RegulationVersionWhereInput = jurisdictionCode
      ? {
          regulation: {
            jurisdiction: {
              code: jurisdictionCode,
            },
          },
        }
      : {}

    const whereClause: Prisma.DeadlineWhereInput = {
      deadlineDate: {
        gte: now,
        lte: futureDate,
      },
      regulationVersion: regulationVersionFilter,
    }

    // Add risk level filter if provided
    if (riskLevel && ['CRITICAL', 'IMPORTANT', 'ROUTINE'].includes(riskLevel)) {
      whereClause.riskLevel = riskLevel as RiskLevel
    }

    // Fetch deadlines with relations
    const deadlines = await prisma.deadline.findMany({
      where: whereClause,
      include: {
        regulationVersion: {
          include: {
            regulation: {
              include: {
                jurisdiction: true,
              },
            },
          },
        },
      },
      orderBy: {
        deadlineDate: 'asc',
      },
    })

    // Calculate days remaining for each deadline
    const deadlinesWithDays: DeadlineWithDaysRemaining[] = deadlines.map((deadline) => ({
      ...deadline,
      daysRemaining: calculateDaysRemaining(deadline.deadlineDate),
    }))

    // Calculate statistics
    const criticalCount = deadlines.filter((d) => d.riskLevel === 'CRITICAL').length
    const importantCount = deadlines.filter((d) => d.riskLevel === 'IMPORTANT').length
    const routineCount = deadlines.filter((d) => d.riskLevel === 'ROUTINE').length

    const response: DeadlineListResponse = {
      deadlines: deadlinesWithDays,
      totalCount: deadlines.length,
      criticalCount,
      importantCount,
      routineCount,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[API /api/deadlines] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
