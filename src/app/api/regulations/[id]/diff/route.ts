/**
 * PolicyDiff API Endpoint
 * POST: Generate diff for regulation versions
 * GET: Retrieve existing diff
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';
import {
  generateTextDiff,
  calculateChangeMetrics,
  formatDiffForDisplay,
} from '@/lib/policydiff';
import {
  summarizeRegulationChanges,
  calculateSignificance,
} from '@/lib/ai/summarizer';
import { SignificanceScore } from '@/types/policydiff';

// Request validation schema
const diffRequestSchema = z.object({
  previousVersionId: z.string().min(1),
  currentVersionId: z.string().min(1),
});

type DiffRequest = z.infer<typeof diffRequestSchema>;

/**
 * POST /api/regulations/[id]/diff
 * Generate a new PolicyDiff or return cached result
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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

    const validationResult = diffRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validationResult.error },
        { status: 400 }
      );
    }

    const { previousVersionId, currentVersionId } = validationResult.data;
    const regulationId = params.id;

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

    // Fetch both regulation versions
    const [previousVersion, currentVersion, regulation] = await Promise.all([
      prisma.regulationVersion.findUnique({
        where: { id: previousVersionId },
        include: { regulation: { include: { jurisdiction: true } } },
      }),
      prisma.regulationVersion.findUnique({
        where: { id: currentVersionId },
        include: { regulation: { include: { jurisdiction: true } } },
      }),
      prisma.regulation.findUnique({
        where: { id: regulationId },
        include: {
          jurisdiction: true,
        },
      }),
    ]);

    // Validation checks
    if (!previousVersion || !currentVersion) {
      return NextResponse.json(
        { error: 'One or both regulation versions not found' },
        { status: 404 }
      );
    }

    if (previousVersion.regulationId !== currentVersion.regulationId) {
      return NextResponse.json(
        { error: 'Versions must belong to the same regulation' },
        { status: 400 }
      );
    }

    if (!regulation) {
      return NextResponse.json(
        { error: 'Regulation not found' },
        { status: 404 }
      );
    }

    // Check if PolicyDiff already exists
    const existingDiff = await prisma.policyDiff.findFirst({
      where: {
        regulationVersionId: currentVersionId,
        previousVersionId: previousVersionId,
      },
    });

    if (existingDiff) {
      console.log(`[API] Returning existing PolicyDiff: ${existingDiff.id}`);
      return NextResponse.json(existingDiff, { status: 200 });
    }

    // Generate diff
    console.log(
      `[API] Generating new PolicyDiff for ${regulation.title} (v${previousVersion.versionNumber} → v${currentVersion.versionNumber})`
    );

    const diffResult = generateTextDiff(
      previousVersion.contentText || '',
      currentVersion.contentText || ''
    );

    const metrics = calculateChangeMetrics(diffResult);
    const displayDiff = formatDiffForDisplay(diffResult);

    // AI processing
    const summary = await summarizeRegulationChanges(
      displayDiff,
      regulation.title
    );

    // Calculate significance
    const significanceScore = calculateSignificance(metrics, summary);

    // Create PolicyDiff record
    const policyDiff = await prisma.policyDiff.create({
      data: {
        regulationVersionId: currentVersionId,
        previousVersionId: previousVersionId,
        diffText: displayDiff,
        summary: summary.summary,
        keyChanges: summary.keyChanges,
        significanceScore: significanceScore,
        aiConfidence: summary.confidence,
      },
    });

    console.log(
      `[API] Created PolicyDiff: ${policyDiff.id} with significance: ${significanceScore}`
    );

    return NextResponse.json(policyDiff, { status: 201 });
  } catch (error) {
    console.error('[API Error] Failed to generate PolicyDiff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/regulations/[id]/diff
 * Retrieve existing PolicyDiff for a regulation
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const regulationId = params.id;

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

    // Fetch regulation
    const regulation = await prisma.regulation.findUnique({
      where: { id: regulationId },
    });

    if (!regulation) {
      return NextResponse.json(
        { error: 'Regulation not found' },
        { status: 404 }
      );
    }

    // Get most recent PolicyDiff
    const policyDiff = await prisma.policyDiff.findFirst({
      where: {
        regulationVersion: {
          regulationId: regulationId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!policyDiff) {
      return NextResponse.json(
        { error: 'No PolicyDiff found for this regulation' },
        { status: 404 }
      );
    }

    return NextResponse.json(policyDiff, { status: 200 });
  } catch (error) {
    console.error('[GET Error] Failed to retrieve PolicyDiff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
