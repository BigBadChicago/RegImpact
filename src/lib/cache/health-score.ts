import { prisma } from '@/lib/prisma'

export async function getHealthScoreFromCache(customerId: string) {
  const cached = await prisma.healthScoreCache.findUnique({
    where: { customerId },
    select: { score: true, expiresAt: true }
  })

  // Check if cache is still valid
  if (cached && cached.expiresAt > new Date()) {
    return cached.score
  }

  // Cache expired or not found
  return null
}

export async function cacheHealthScore(
  customerId: string,
  score: number,
  ttlHours = 6
) {
  const expiresAt = new Date(Date.now() + ttlHours * 3600000)

  await prisma.healthScoreCache.upsert({
    where: { customerId },
    create: {
      customerId,
      score,
      components: {},
      expiresAt
    },
    update: {
      score,
      expiresAt,
      calculatedAt: new Date()
    }
  })
}

export async function invalidateHealthScoreCache(customerId: string) {
  await prisma.healthScoreCache.deleteMany({
    where: { customerId }
  })
}
