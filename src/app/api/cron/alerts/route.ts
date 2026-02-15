import { NextRequest, NextResponse } from 'next/server'
import { generateAlertsForAllCustomers } from '@/lib/alerts/generator'

/**
 * Cron endpoint for daily alert generation
 * Called by Vercel Cron or external service
 * 
 * Vercel Cron Header: 'X-Vercel-Cron-Secret' must match CRON_SECRET env var
 * External Service: Can POST with ?secret=CRON_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Validate cron secret
    const vercelSecret = request.headers.get('x-vercel-cron-secret')
    const searchSecret = new URL(request.url).searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

    if (vercelSecret !== cronSecret && searchSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate alerts for all customers
    const result = await generateAlertsForAllCustomers()

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        ...result
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Cron Alert Generation Error]', error)
    return NextResponse.json(
      { error: 'Alert generation failed', message: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for testing cron
 * Should only be accessible with cron secret
 */
export async function GET(request: NextRequest) {
  try {
    const searchSecret = new URL(request.url).searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

    if (searchSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await generateAlertsForAllCustomers()

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        ...result,
        message: 'Test successful. In production, this should only be called by cron.'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Cron Alert Generation Error]', error)
    return NextResponse.json(
      { error: 'Alert generation failed', message: String(error) },
      { status: 500 }
    )
  }
}
