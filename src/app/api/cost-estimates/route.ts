/**
 * Cost Estimates List API Endpoint
 * GET: Retrieve all cost estimates for customer
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';

/**
 * GET /api/cost-estimates
 * List all cost estimates for authenticated user's customer
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.customerId) {
      return NextResponse.json(
        { error: 'User not associated with a customer' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const whereClause: any = {
      customerId: user.customerId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch cost estimates
    const costEstimates = await prisma.costEstimate.findMany({
      where: whereClause,
      include: {
        regulationVersion: {
          include: {
            regulation: {
              include: { jurisdiction: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate aggregate totals
    const totalOneTimeCostLow = costEstimates.reduce(
      (sum, est) => sum + est.oneTimeCostLow,
      0
    );
    const totalOneTimeCostHigh = costEstimates.reduce(
      (sum, est) => sum + est.oneTimeCostHigh,
      0
    );
    const totalRecurringAnnual = costEstimates.reduce(
      (sum, est) => sum + est.recurringCostAnnual,
      0
    );

    // Calculate 3-year exposure
    const threeYearExposureLow =
      totalOneTimeCostLow + totalRecurringAnnual * 3;
    const threeYearExposureHigh =
      totalOneTimeCostHigh + totalRecurringAnnual * 3;

    return NextResponse.json(
      {
        costEstimates,
        summary: {
          count: costEstimates.length,
          totalOneTimeCostLow,
          totalOneTimeCostHigh,
          totalRecurringAnnual,
          threeYearExposureLow,
          threeYearExposureHigh,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[CostEstimates] Error fetching estimates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost estimates' },
      { status: 500 }
    );
  }
}
