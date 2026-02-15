import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { cacheHealthScore, getHealthScoreFromCache } from '@/lib/cache/health-score'
import { format, startOfDay, addDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const resend = new Resend(process.env.RESEND_API_KEY)

// ✅ OPTIMIZATION 3: Consolidated query (4 queries → parallel 2)
export async function generateOptimizedDigest(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      timezone: true,
      customer: { select: { id: true } }
    }
  })

  if (!user) throw new Error('User not found')

  const customerId = user.customer.id
  const now = new Date()

  // ✅ OPTIMIZATION 7: Check cache first (6-hour TTL)
  let healthScore = await getHealthScoreFromCache(customerId)
  if (!healthScore) {
    // Placeholder - implement actual health score calculation
    healthScore = 75
    await cacheHealthScore(customerId, healthScore, 6)
  }

  // ✅ OPTIMIZATION 3: Parallel queries consolidated
  const [deadlines, regulations] = await Promise.all([
    prisma.deadline.findMany({
      where: {
        regulationVersion: {
          costEstimates: {
            some: { customerId }
          }
        },
        deadlineDate: { gte: now, lte: addDays(now, 7) }
      },
      select: {
        id: true,
        deadlineDate: true,
        deadlineType: true,
        regulationVersion: { select: { regulation: { select: { id: true, title: true } } } }
      },
      orderBy: { deadlineDate: 'asc' },
      take: 5 // ✅ OPTIMIZATION 8
    }),
    prisma.regulation.findMany({
      where: {
        versions: {
          some: {
            costEstimates: { some: { customerId } }
          }
        },
        createdAt: { gte: addDays(now, -1) }
      },
      select: {
        id: true,
        title: true,
        jurisdiction: { select: { name: true } },
        sourceUrl: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5 // ✅ OPTIMIZATION 8
    })
  ])

  const html = generateEmailHTML(healthScore, deadlines, regulations)
  return html
}

// ✅ OPTIMIZATION 5: Batch by timezone
export async function sendBatchDigestsByTimezone() {
  try {
    const now = new Date()

    // Get users grouped by timezone in single query
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        timezone: true,
        customerId: true
      },
      take: 1000 // Process in batches
    })

    // Group by timezone
    const byTimezone = new Map<string, typeof users>()
    for (const user of users) {
      const tz = user.timezone || 'America/New_York'
      if (!byTimezone.has(tz)) byTimezone.set(tz, [])
      byTimezone.get(tz)!.push(user)
    }

    let emailsSent = 0
    let batches = 0

    // Send one batch per timezone
    for (const [tz, tzUsers] of byTimezone) {
      const zonedTime = toZonedTime(now, tz)
      if (zonedTime.getHours() !== 7) continue // Only at 7 AM

      // ✅ OPTIMIZATION 5: Single batch send per timezone (1 call vs N=user count)
      const emails = await Promise.all(
        tzUsers.map(async (user) => ({
          to: user.email,
          subject: `Your RegImpact Daily Briefing - ${format(now, 'MMM d')}`,
          html: await generateOptimizedDigest(user.id)
        }))
      )

      // Send in max 100 per Resend batch
      for (let i = 0; i < emails.length; i += 100) {
        const batch = emails.slice(i, i + 100)
        await resend.batch.send(batch as any)
        batches++
        emailsSent += batch.length
      }
    }

    return {
      emailsSent,
      batchesSent: batches
    }
  } catch (error) {
    console.error('[Batch Digest Error]', error)
    throw error
  }
}

function generateEmailHTML(
  healthScore: number,
  deadlines: any[],
  regulations: any[]
): string {
  const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .section { padding: 20px; border-bottom: 1px solid #eee; }
        .metric { display: inline-block; padding: 15px; background: #f3f4f6; border-radius: 8px; font-size: 32px; font-weight: bold; color: ${scoreColor}; }
        .deadline { padding: 10px; margin: 5px 0; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 14px; }
        .cta { display: inline-block; margin: 20px 0; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>RegImpact Daily Briefing</h1>
        <p>${format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>
      
      <div class="section">
        <h2>Compliance Health</h2>
        <div class="metric">${healthScore}</div>
      </div>
      
      <div class="section">
        <h2>⚠️ Critical Deadlines (Next 7 Days)</h2>
        ${
          deadlines.length > 0
            ? deadlines.map((d) => `<div class="deadline"><strong>${d.regulationVersion.regulation.title}</strong><br>${d.deadlineType} - Due ${format(new Date(d.deadlineDate), 'MMM d')}</div>`).join('')
            : '<p>No critical deadlines this week!</p>'
        }
      </div>
      
      <div class="section">
        <h2>🆕 New Regulations (Last 24 Hours)</h2>
        ${
          regulations.length > 0
            ? regulations.map((r) => `<div style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${r.title}</strong><br><span style="font-size: 12px; color: #6b7280;">${r.jurisdiction.name}</span></div>`).join('')
            : '<p>No new regulations detected.</p>'
        }
      </div>
      
      <div class="section" style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" class="cta">View Full Dashboard</a>
      </div>
    </body>
    </html>
  `
}
