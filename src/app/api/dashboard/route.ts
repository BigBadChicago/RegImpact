import { NextResponse } from 'next/server';
import { auth } from '@/auth.config';
import { getMockDashboardData } from '@/lib/mock-data';

/**
 * GET /api/dashboard
 * 
 * Retrieves dashboard data for the authenticated user.
 * 
 * @returns {DashboardData} Dashboard metrics and recent activity
 * @throws {401} If user is not authenticated
 * @throws {500} If there is a server error
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Replace with actual Prisma query scoped by session.user.customerId
    // Example query structure:
    // const dashboardData = await prisma.dashboard.findUnique({
    //   where: { customerId: session.user.customerId },
    //   include: {
    //     upcomingDeadlines: { where: { date: { gte: new Date() } }, take: 5 },
    //     recentChanges: { orderBy: { date: 'desc' }, take: 5 },
    //   },
    // });

    // For MVP: return mock data
    const dashboardData = getMockDashboardData();

    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
