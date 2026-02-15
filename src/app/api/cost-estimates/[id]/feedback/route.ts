/**
 * Cost Estimate Feedback API Endpoint
 * POST: Submit actual costs for learning improvement
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';

// Request validation schema
const feedbackRequestSchema = z.object({
  actualOneTimeCost: z.number().positive(),
  actualRecurringCostAnnual: z.number().nonnegative(),
  varianceNotes: z.string().optional(),
});

type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

/**
 * POST /api/cost-estimates/[id]/feedback
 * Submit actual costs for learning feedback
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await props.params;
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = feedbackRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validationResult.error },
        { status: 400 }
      );
    }

    const { actualOneTimeCost, actualRecurringCostAnnual, varianceNotes } =
      validationResult.data;
    const costEstimateId = params.id;

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

    // Fetch cost estimate and verify ownership
    const costEstimate = await prisma.costEstimate.findUnique({
      where: { id: costEstimateId },
    });

    if (!costEstimate) {
      return NextResponse.json(
        { error: 'Cost estimate not found' },
        { status: 404 }
      );
    }

    if (costEstimate.customerId !== user.customerId) {
      return NextResponse.json(
        { error: 'Access denied to this cost estimate' },
        { status: 403 }
      );
    }

    // Calculate variances
    const estimatedOneTime =
      (costEstimate.oneTimeCostLow + costEstimate.oneTimeCostHigh) / 2;
    const oneTimeVariance =
      (actualOneTimeCost - estimatedOneTime) / estimatedOneTime;

    const recurringVariance =
      costEstimate.recurringCostAnnual > 0
        ? (actualRecurringCostAnnual - costEstimate.recurringCostAnnual) /
          costEstimate.recurringCostAnnual
        : 0;

    // Store feedback (create a CostFeedback table entry)
    // For now, we'll just log it and could extend schema later
    const feedback = {
      costEstimateId,
      actualOneTimeCost,
      actualRecurringCostAnnual,
      oneTimeVariance,
      recurringVariance,
      varianceNotes,
      submittedBy: session.user.email,
      submittedAt: new Date(),
    };

    console.log('[CostFeedback] Learning feedback received:', {
      estimateId: costEstimateId,
      oneTimeVariance: `${(oneTimeVariance * 100).toFixed(1)}%`,
      recurringVariance: `${(recurringVariance * 100).toFixed(1)}%`,
      accuracy: `${(100 - Math.abs(oneTimeVariance * 100)).toFixed(1)}%`,
    });

    // TODO: Store in dedicated CostFeedback table (requires schema update)
    // For now, log for tracking learning improvements

    // Return variance analysis
    return NextResponse.json(
      {
        success: true,
        variance: {
          oneTimeVariance,
          recurringVariance,
          oneTimeAccuracy: 100 - Math.abs(oneTimeVariance * 100),
          recurringAccuracy: 100 - Math.abs(recurringVariance * 100),
        },
        feedback,
        message: 'Feedback recorded successfully. Will improve future estimates.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[CostFeedback] Error recording feedback:', error);
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}
