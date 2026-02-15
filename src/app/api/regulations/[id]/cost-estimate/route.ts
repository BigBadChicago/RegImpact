/**
 * Cost Estimate API Endpoint
 * POST: Generate cost estimate for regulation
 * GET: Retrieve existing cost estimate
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';
import {
  extractCostDrivers,
  calculateImplementationCost,
  generateScenarios,
  applyLearningFeedback,
} from '@/lib/cost-estimator';
import { Industry, TechMaturity, RiskLevel } from '@/types/cost-estimate';

// Request validation schema
const costEstimateRequestSchema = z.object({
  useAI: z.boolean().optional().default(false),
  companyProfile: z
    .object({
      industry: z.nativeEnum(Industry).optional(),
      employeeCount: z.number().optional(),
      revenue: z.number().optional(),
      geographicComplexity: z.number().optional(),
      techMaturity: z.nativeEnum(TechMaturity).optional(),
      riskAppetite: z.nativeEnum(RiskLevel).optional(),
    })
    .optional(),
});

type CostEstimateRequest = z.infer<typeof costEstimateRequestSchema>;

/**
 * POST /api/regulations/[id]/cost-estimate
 * Generate a new cost estimate or return cached result
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
      body = {}; // Allow empty body with defaults
    }

    const validationResult = costEstimateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validationResult.error },
        { status: 400 }
      );
    }

    const regulationVersionId = params.id;

    // Fetch user's customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { customer: true },
    });

    if (!user?.customerId) {
      return NextResponse.json(
        { error: 'User not associated with a customer' },
        { status: 403 }
      );
    }

    const customerId = user.customerId;

    // Check for existing cost estimate (cached)
    const existingEstimate = await prisma.costEstimate.findFirst({
      where: {
        regulationVersionId,
        customerId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingEstimate) {
      console.log(
        `[CostEstimate] Returning cached estimate for regulation ${regulationVersionId}`
      );
      return NextResponse.json(existingEstimate, { status: 200 });
    }

    // Fetch regulation version
    const regulationVersion = await prisma.regulationVersion.findUnique({
      where: { id: regulationVersionId },
      include: {
        regulation: {
          include: { jurisdiction: true },
        },
      },
    });

    if (!regulationVersion) {
      return NextResponse.json(
        { error: 'Regulation version not found' },
        { status: 404 }
      );
    }

    // Build company profile
    const companyProfile = {
      industry: validationResult.data.companyProfile?.industry || Industry.TECHNOLOGY,
      employeeCount: validationResult.data.companyProfile?.employeeCount || 100,
      revenue: validationResult.data.companyProfile?.revenue,
      geographicComplexity:
        validationResult.data.companyProfile?.geographicComplexity || 1,
      techMaturity:
        validationResult.data.companyProfile?.techMaturity || TechMaturity.MEDIUM,
      riskAppetite:
        validationResult.data.companyProfile?.riskAppetite || RiskLevel.LOW,
    };

    console.log(
      `[CostEstimate] Generating new estimate for regulation ${regulationVersionId}`
    );

    // Extract cost drivers (AI or deterministic)
    const costDrivers = await extractCostDrivers(
      regulationVersion.fullText,
      regulationVersion.regulation.title
    );

    // Calculate implementation cost with calibration
    const baseCost = calculateImplementationCost(costDrivers, companyProfile);

    // Generate scenarios
    const scenarios = generateScenarios(
      {
        oneTimeCost: (baseCost.oneTimeCostLow + baseCost.oneTimeCostHigh) / 2,
        recurringCostAnnual: baseCost.recurringCostAnnual,
      },
      companyProfile
    );

    // Fetch historical estimates for learning
    const historicalEstimates = await prisma.costEstimate.findMany({
      where: {
        customerId,
        // Could filter by regulation type or industry for better calibration
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // Derive variances using historical estimate midpoints as proxy data
    const baseOneTimeMid =
      (baseCost.oneTimeCostLow + baseCost.oneTimeCostHigh) / 2;
    const historicalVariances = historicalEstimates
      .map((estimate) => {
        const actualMid = (estimate.oneTimeCostLow + estimate.oneTimeCostHigh) / 2;
        if (!Number.isFinite(actualMid) || baseOneTimeMid === 0) {
          return null;
        }
        const variance = (actualMid - baseOneTimeMid) / baseOneTimeMid;
        return {
          estimated: baseOneTimeMid,
          actual: actualMid,
          variance,
        };
      })
      .filter(
        (variance): variance is {
          estimated: number;
          actual: number;
          variance: number;
        } => Boolean(variance)
      );

    let adjustedCost = { ...baseCost };
    if (historicalVariances.length > 0) {
      adjustedCost = {
        ...baseCost,
        ...applyLearningFeedback(
          {
            oneTimeCostLow: baseCost.oneTimeCostLow,
            oneTimeCostHigh: baseCost.oneTimeCostHigh,
            confidence: baseCost.confidence,
          },
          historicalVariances
        ),
      };
    }

    // Create database record
    const costEstimate = await prisma.costEstimate.create({
      data: {
        regulationVersionId,
        customerId,
        oneTimeCostLow: adjustedCost.oneTimeCostLow,
        oneTimeCostHigh: adjustedCost.oneTimeCostHigh,
        recurringCostAnnual: adjustedCost.recurringCostAnnual,
        costDriversJson: {
          drivers: costDrivers.map((d) => ({
            id: d.id,
            category: d.category,
            description: d.description,
            isOneTime: d.isOneTime,
            estimatedCost: d.estimatedCost,
            confidence: d.confidence,
            department: d.department,
          })),
        },
        departmentBreakdown: {
          departments: baseCost.departmentBreakdown.map((d) => ({
            department: d.department,
            oneTimeCost: d.oneTimeCost,
            recurringCostAnnual: d.recurringCostAnnual,
            fteImpact: d.fteImpact,
            budgetCode: d.budgetCode,
          })),
        },
        estimationMethod: baseCost.estimationMethod,
        confidence: adjustedCost.confidence,
      },
    });

    // Return full estimate with scenarios
    const response = {
      ...costEstimate,
      scenarios,
      regulationTitle: regulationVersion.regulation.title,
      jurisdiction: regulationVersion.regulation.jurisdiction.name,
    };

    console.log(
      `[CostEstimate] Created estimate ${costEstimate.id} with ${costDrivers.length} drivers`
    );

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[CostEstimate] Error generating estimate:', error);
    return NextResponse.json(
      { error: 'Failed to generate cost estimate' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/regulations/[id]/cost-estimate
 * Retrieve existing cost estimate
 */
export async function GET(
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

    const regulationVersionId = params.id;

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

    // Fetch cost estimate
    const costEstimate = await prisma.costEstimate.findFirst({
      where: {
        regulationVersionId,
        customerId: user.customerId,
      },
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

    if (!costEstimate) {
      return NextResponse.json(
        { error: 'Cost estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(costEstimate, { status: 200 });
  } catch (error) {
    console.error('[CostEstimate] Error fetching estimate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost estimate' },
      { status: 500 }
    );
  }
}
