import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import prisma from '@/lib/prisma'
import { extractDeadlinesHybrid, validateDeadline, categorizeRiskLevel } from '@/lib/deadline-extractor'
import { z } from 'zod'
import type { DeadlineExtractionResponse } from '@/types/deadline'

/**
 * Request body validation schema
 */
const extractionRequestSchema = z.object({
  versionId: z.string().min(1, 'versionId is required'),
})

/**
 * POST /api/regulations/[id]/deadlines/extract
 * 
 * Extract deadlines from a regulation version using hybrid approach:
 * 1. Try regex/chrono-node extraction first (fast, free)
 * 2. Fall back to AI extraction if needed (slower, costs money)
 * 
 * Request Body:
 * - versionId: ID of the regulation version to extract from
 * 
 * @returns Extracted deadlines with metadata
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validation = extractionRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: `Invalid request: ${validation.error.issues[0].message}` },
        { status: 400 }
      )
    }

    const { versionId } = validation.data
    const regulationId = params.id

    // Fetch regulation version
    const regulationVersion = await prisma.regulationVersion.findUnique({
      where: { id: versionId },
      include: {
        regulation: {
          include: {
            jurisdiction: true,
          },
        },
      },
    })

    if (!regulationVersion) {
      return NextResponse.json(
        { error: 'Regulation version not found' },
        { status: 404 }
      )
    }

    // Verify regulation ID matches
    if (regulationVersion.regulation.id !== regulationId) {
      return NextResponse.json(
        { error: 'Version does not belong to this regulation' },
        { status: 400 }
      )
    }

    // Check if deadlines already extracted for this version
    const existingDeadline = await prisma.deadline.findFirst({
      where: {
        regulationVersionId: versionId,
      },
    })

    if (existingDeadline) {
      // Return existing deadlines
      const existingDeadlines = await prisma.deadline.findMany({
        where: {
          regulationVersionId: versionId,
        },
        orderBy: {
          deadlineDate: 'asc',
        },
      })

      const response: DeadlineExtractionResponse = {
        deadlines: existingDeadlines,
        extractionMethod: 'hybrid', // Unknown which method was used originally
        extractedCount: existingDeadlines.length,
        message: 'Deadlines already extracted for this version',
      }

      return NextResponse.json(response, { status: 200 })
    }

    // Extract deadlines using hybrid approach
    console.log(`[API] Extracting deadlines for regulation: ${regulationVersion.regulation.title}`)
    
    const { deadlines: extractedDeadlines, method } = await extractDeadlinesHybrid(
      regulationVersion.contentText,
      regulationVersion.regulation.title
    )

    // Validate all extracted deadlines
    const validDeadlines = extractedDeadlines.filter((deadline) =>
      validateDeadline(deadline)
    )

    console.log(`[API] Extracted ${extractedDeadlines.length} deadlines, ${validDeadlines.length} valid`)

    if (validDeadlines.length === 0) {
      return NextResponse.json(
        {
          deadlines: [],
          extractionMethod: method,
          extractedCount: 0,
          message: 'No valid deadlines found in regulation text',
        },
        { status: 200 }
      )
    }

    // Prepare deadline records for database
    const deadlineRecords = validDeadlines.map((deadline) => ({
      regulationVersionId: versionId,
      deadlineDate: deadline.deadlineDate!,
      deadlineType: deadline.deadlineType!,
      description: deadline.description || 'Compliance deadline',
      riskLevel: deadline.riskLevel || categorizeRiskLevel(
        deadline,
        regulationVersion.contentText
      ),
      extractionConfidence: deadline.extractionConfidence || 0.8,
      notificationSent: false,
    }))

    // Insert deadlines into database
    await prisma.deadline.createMany({
      data: deadlineRecords,
    })

    // Fetch created deadlines to return with IDs
    const createdDeadlines = await prisma.deadline.findMany({
      where: {
        regulationVersionId: versionId,
      },
      orderBy: {
        deadlineDate: 'asc',
      },
    })

    const response: DeadlineExtractionResponse = {
      deadlines: createdDeadlines,
      extractionMethod: method,
      extractedCount: createdDeadlines.length,
      message: `Successfully extracted ${createdDeadlines.length} deadline(s)`,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[API /api/regulations/[id]/deadlines/extract] Error:', error)
    
    // Check if it's an OpenAI API error
    if (error instanceof Error && error.message.includes('OpenAI')) {
      return NextResponse.json(
        { error: 'AI extraction failed. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
