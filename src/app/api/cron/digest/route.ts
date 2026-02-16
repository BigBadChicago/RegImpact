import { NextRequest, NextResponse } from 'next/server'
import { sendBatchDigestsByTimezone } from '@/lib/email/digest-optimized'

/**
 * Cron endpoint for daily digest email generation
 * Sends batched emails by timezone at 7 AM local time
 * 
 * Vercel Cron Header: 'X-Vercel-Cron-Secret' must match CRON_SECRET env var
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

    // Send batched digests by timezone
    const result = await sendBatchDigestsByTimezone()

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        ...(result || {})
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Cron Digest Generation Error]', error)
    return NextResponse.json(
      { error: 'Digest generation failed', message: String(error) },
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

    const result = await sendBatchDigestsByTimezone()

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        ...(result || {}),
        message: 'Test successful. In production, this should only be called by cron.'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Cron Digest Generation Error]', error)
    return NextResponse.json(
      { error: 'Digest generation failed', message: String(error) },
      { status: 500 }
    )
  }
}
