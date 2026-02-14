/**
 * Dashboard API Endpoint
 * Returns dashboard data including stats and recent changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth.config';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user
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

    // Fetch dashboard data
    // Note: Add customer-based filtering when jurisdiction monitoring is implemented in schema
    const [regulationCount, policyDiffCount, recentDiffs] = await Promise.all([
      prisma.regulation.count(),
      prisma.policyDiff.count(),
      prisma.policyDiff.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
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
      }),
    ]);

    return NextResponse.json({
      stats: {
        regulationCount,
        policyDiffCount,
      },
      recentChanges: recentDiffs.map((diff) => ({
        id: diff.id,
        title: diff.regulationVersion.regulation.title,
        jurisdiction: diff.regulationVersion.regulation.jurisdiction.name,
        summary: diff.summary,
        significanceScore: diff.significanceScore,
        createdAt: diff.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Dashboard API Error]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
