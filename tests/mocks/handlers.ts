import { http, HttpResponse } from 'msw'

/**
 * MSW Request Handlers for mocking external API calls
 * These handlers intercept fetch requests matching the specified URLs
 * and return mock responses instead of making real API calls
 */

/**
 * Mock OpenAI API responses
 * This prevents real API calls during testing (zero cost testing)
 */
const openAIHandler = http.post(
  'https://api.openai.com/v1/chat/completions',
  async ({ request }) => {
    const body = await request.json() as any
    const userMessage = body.messages?.find((m: any) => m.role === 'user')?.content || ''
    
    // Check if this is a deadline extraction request
    const isDeadlineRequest = userMessage.includes('Extract all compliance deadlines')
    
    if (isDeadlineRequest) {
      // Extract the regulation content from the user message
      // The format is: "Extract all compliance deadlines...\n\nRegulation text:\n<content>"
      const regulationText = userMessage.split('Regulation text:')[1]?.trim() || ''
      const textToScan = regulationText || userMessage
      
      // Check if the regulation text actually contains dates
      const hasDatePatterns = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}|Q[1-4] \d{4}|within \d+ days|end of Q[1-4]/i.test(textToScan)
      
      if (!hasDatePatterns) {
        // No dates found - return empty array
        return HttpResponse.json({
          id: 'chatcmpl-mock-no-deadlines',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify([]),
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 2, total_tokens: 52 },
        })
      }
      
      // Has dates - return mock deadline extractions
      return HttpResponse.json({
        id: 'chatcmpl-deadline-test',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify([
                {
                  deadlineDate: '2026-03-15',
                  deadlineType: 'submission',
                  description: 'Initial compliance filing required',
                  riskLevel: 'CRITICAL',
                  confidence: 0.9,
                },
                {
                  deadlineDate: '2026-06-30',
                  deadlineType: 'reporting',
                  description: 'Quarterly report due',
                  riskLevel: 'IMPORTANT',
                  confidence: 0.85,
                },
              ]),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 400,
          completion_tokens: 150,
          total_tokens: 550,
        },
      })
    }
    
    // Default PolicyDiff response
    return HttpResponse.json({
      id: 'chatcmpl-test-123',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              summary:
                'This regulation update increases paid leave requirements from 3 days to 5 days annually with additional accrual provisions.',
              keyChanges: [
                'Minimum paid leave increased from 3 days to 5 days per year',
                'Added accrual formula: 1 hour per 30 hours worked',
                'Employer must post policy in workplace',
              ],
              significance: 'HIGH',
              affectedDepartments: ['HR', 'Payroll'],
              complianceDeadline: '2026-06-01',
              estimatedCost: 'Medium ($50K-$100K annually)',
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 500,
        completion_tokens: 200,
        total_tokens: 700,
      },
    })
  }
)

/**
 * Mock NextAuth credential callback
 */
const nextAuthHandler = http.post('/api/auth/callback/credentials', () => {
  return HttpResponse.json({
    ok: true,
    status: 200,
    url: '/dashboard',
  })
})

/**
 * Mock NextAuth session endpoint
 */
const sessionHandler = http.get('/api/auth/session', () => {
  return HttpResponse.json({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      customerId: 'test-customer-123',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
})

/**
 * Mock dashboard API endpoint
 */
const dashboardHandler = http.get('/api/dashboard', () => {
  return HttpResponse.json({
    totalExposure: 15,
    upcomingDeadlines: [
      {
        id: 'deadline-1',
        regulationId: 'reg-1',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Paid Sick Leave Compliance',
        riskLevel: 'IMPORTANT',
      },
    ],
    highRiskChanges: [
      {
        id: 'change-1',
        regulationId: 'reg-1',
        title: 'Paid Sick Leave Update',
        jurisdiction: 'California',
        significance: 'HIGH',
        daysUntilDeadline: 30,
      },
    ],
    recentPolicies: [
      {
        id: 'policy-1',
        title: 'California Paid Sick Leave',
        jurisdiction: 'California',
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  })
})

/**
 * Mock policy diff API endpoint
 */
const policyDiffHandler = http.post(
  '/api/regulations/:id/diff',
  ({ params }) => {
    return HttpResponse.json({
      id: `diff-${params.id}-123`,
      regulationId: params.id as string,
      diffText: `- 3 days of paid sick leave per year
+ 5 days of paid sick leave per year
+ Accrues at 1 hour per 30 hours worked`,
      summary:
        'Increased paid leave requirements with new accrual formula',
      keyChanges: [
        'Minimum days increased from 3 to 5',
        'New accrual formula added',
      ],
      significanceScore: 0.85,
      aiConfidence: 0.92,
      generatedAt: new Date().toISOString(),
    })
  }
)

/**
 * Export all handlers for use in MSW setup
 */
export const handlers = [
  openAIHandler,
  nextAuthHandler,
  sessionHandler,
  dashboardHandler,
  policyDiffHandler,
]
