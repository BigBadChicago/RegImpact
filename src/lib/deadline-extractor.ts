import { parse } from 'chrono-node'
import {
  DeadlineCandidate,
  Deadline,
  RiskLevel,
  AIDeadlineExtraction,
  DEFAULT_RISK_CATEGORIZATION,
} from '@/types/deadline'

/**
 * Deadline Extraction Utilities
 * 
 * This module provides functions for extracting, validating, and categorizing
 * compliance deadlines from regulation text using both regex patterns and AI.
 * 
 * Core Functions:
 * - extractDatesWithRegex: Fast extraction using chrono-node natural language parser
 * - extractDeadlinesWithAI: AI-powered extraction for complex cases
 * - validateDeadline: Ensure deadline meets business rules
 * - categorizeRiskLevel: Determine CRITICAL/IMPORTANT/ROUTINE risk level
 * - calculateDaysRemaining: Calculate days until deadline
 */

/**
 * Extract dates from text using regex patterns and natural language parsing
 * 
 * This is the first-pass extraction method (fast and free).
 * Uses chrono-node library for parsing natural language dates.
 * 
 * @param text - Regulation text to analyze
 * @returns Array of deadline candidates with confidence scores
 * 
 * @example
 * ```ts
 * const text = "Compliance required by January 15, 2025"
 * const candidates = extractDatesWithRegex(text)
 * // Returns: [{ date: Date(2025-01-15), context: "...", confidence: 0.9 }]
 * ```
 */
export function extractDatesWithRegex(text: string): DeadlineCandidate[] {
  if (!text || text.trim() === '') {
    return []
  }

  const candidates: DeadlineCandidate[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Reset to midnight for comparison

  try {
    // Use chrono-node for natural language date parsing
    // forwardDate: true means ambiguous dates are assumed to be in the future
    const parsed = parse(text, now, { forwardDate: true })

    parsed.forEach((item) => {
      if (item.start) {
        const date = item.start.date()
        
        // Reset to midnight for consistent comparison
        date.setHours(0, 0, 0, 0)

        // Only include future dates (or today)
        if (date >= now) {
          // Extract context (surrounding text)
          const context = extractContext(text, item.text, item.index)

          candidates.push({
            date,
            context,
            confidence: calculateConfidence(item, context),
          })
        }
      }
    })

    // Handle special quarterly deadlines (Q1, Q2, Q3, Q4)
    const quarterlyDeadlines = extractQuarterlyDeadlines(text, now)
    candidates.push(...quarterlyDeadlines)

    // Deduplicate by date
    return deduplicateCandidates(candidates)
  } catch (error) {
    console.error('[DeadlineExtractor] Error parsing dates with regex:', error)
    return []
  }
}

/**
 * Extract context around a matched date string
 */
function extractContext(text: string, matchedText: string, index: number): string {
  const contextRadius = 150 // characters before and after
  const start = Math.max(0, index - contextRadius)
  const end = Math.min(text.length, index + matchedText.length + contextRadius)
  
  let context = text.substring(start, end).trim()
  
  // Add ellipsis if truncated
  if (start > 0) context = '...' + context
  if (end < text.length) context = context + '...'
  
  return context
}

/**
 * Extract quarterly deadlines (Q1 2025, end of Q2, etc.)
 */
function extractQuarterlyDeadlines(text: string, referenceDate: Date): DeadlineCandidate[] {
  const candidates: DeadlineCandidate[] = []
  
  // Match patterns like "Q1 2025", "end of Q2 2025", "quarter 3 of 2025"
  const quarterPattern = /(?:end\s+of\s+)?Q([1-4])\s+(\d{4})|quarter\s+([1-4])\s+(?:of\s+)?(\d{4})/gi
  
  let match
  while ((match = quarterPattern.exec(text)) !== null) {
    const quarter = parseInt(match[1] || match[3])
    const year = parseInt(match[2] || match[4])
    
    // Calculate last day of quarter
    const quarterEndMonth = quarter * 3 // Q1=3, Q2=6, Q3=9, Q4=12
    const date = new Date(year, quarterEndMonth - 1, 1) // First day of last month
    date.setMonth(date.getMonth() + 1) // Move to next month
    date.setDate(0) // Go back one day to get last day of quarter
    
    // Only include future dates
    if (date >= referenceDate) {
      const context = extractContext(text, match[0], match.index)
      candidates.push({
        date,
        context,
        confidence: 0.85,
      })
    }
  }
  
  return candidates
}

/**
 * Parsed result from chrono-node
 */
interface ChronoParseResult {
  text: string
  index: number
  start: {
    date: () => Date
  }
}

/**
 * Calculate confidence score for a parsed date
 * Higher confidence for explicit dates, lower for relative/ambiguous dates
 */
function calculateConfidence(parsedItem: ChronoParseResult, context: string): number {
  let confidence = 0.6 // Base confidence
  
  const lowerContext = context.toLowerCase()
  const text = parsedItem.text.toLowerCase()
  
  // Boost confidence for explicit date formats
  if (text.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
    confidence = 0.95 // 12/31/2025
  } else if (text.match(/[a-z]+\s+\d{1,2},?\s+\d{4}/)) {
    confidence = 0.9 // January 15, 2025
  } else if (text.match(/\d{1,2}\s+[a-z]+\s+\d{4}/)) {
    confidence = 0.9 // 15 January 2025
  }
  
  // Boost confidence for deadline keywords
  if (lowerContext.match(/\b(by|before|no later than|deadline|due|must|shall)\b/)) {
    confidence += 0.05
  }
  
  // Reduce confidence for vague relative dates
  if (text.match(/\b(soon|promptly|reasonable time|timely|as soon as possible)\b/i)) {
    confidence = 0.3
  }
  
  // Reduce confidence for "within X days" (relative dates)
  if (text.match(/within\s+\d+\s+(days|weeks|months)/)) {
    confidence = 0.7
  }
  
  return Math.min(1, confidence)
}

/**
 * Deduplicate deadline candidates by date
 * Keeps the candidate with highest confidence for each unique date
 */
function deduplicateCandidates(candidates: DeadlineCandidate[]): DeadlineCandidate[] {
  const seen = new Map<string, DeadlineCandidate>()

  candidates.forEach((candidate) => {
    const key = candidate.date.toISOString().split('T')[0] // YYYY-MM-DD
    
    if (!seen.has(key) || candidate.confidence > seen.get(key)!.confidence) {
      seen.set(key, candidate)
    }
  })

  // Sort by date ascending
  return Array.from(seen.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Extract deadlines using AI (OpenAI GPT)
 * 
 * This is the second-pass extraction method (more accurate but costs money).
 * Use when regex extraction returns < 2 results or for complex regulations.
 * 
 * @param regulationText - Full regulation text
 * @param regulationTitle - Title for context
 * @param maxRetries - Number of retry attempts on failure
 * @returns Array of extracted deadlines
 * 
 * @example
 * ```ts
 * const deadlines = await extractDeadlinesWithAI(regulationText, "OSHA Update 2025")
 * ```
 */
export async function extractDeadlinesWithAI(
  regulationText: string,
  regulationTitle: string,
  maxRetries = 3
): Promise<Partial<Deadline>[]> {
  if (!regulationText || regulationText.trim() === '') {
    return []
  }

  // Check cache first (same regulation shouldn't be extracted twice)
  const cacheKey = `deadline_extract_${regulationTitle}_${regulationText.substring(0, 100)}`
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log('[DeadlineExtractor] Cache hit for', regulationTitle)
    return cached
  }

  const systemPrompt = `You are an expert compliance analyst specializing in regulatory deadline extraction.

Your task is to extract ALL compliance deadlines from regulation text and classify their risk level.

For each deadline found, provide:
1. deadlineDate: ISO 8601 date (YYYY-MM-DD)
2. deadlineType: "submission", "certification", "reporting", "implementation", "payment", or "other"
3. description: Clear description of what must be done
4. riskLevel: "CRITICAL" (penalties/violations), "IMPORTANT" (required but no immediate penalty), or "ROUTINE"
5. confidence: 0-1 score indicating extraction certainty

Rules:
- Extract ONLY explicit dates (ignore vague terms like "soon" or "reasonable time")
- For relative dates like "within 30 days", calculate from today: ${new Date().toISOString().split('T')[0]}
- For quarterly deadlines, use last day of quarter (Q1=Mar 31, Q2=Jun 30, Q3=Sep 30, Q4=Dec 31)
- Only include future dates (ignore historical deadlines)
- If penalties/fines are mentioned, mark as CRITICAL
- Return empty array [] if no concrete deadlines found

Return ONLY a valid JSON array, no markdown or explanation.`

  const userPrompt = `Regulation: ${regulationTitle}

Extract all compliance deadlines from this text:

${regulationText.substring(0, 4000)} ${regulationText.length > 4000 ? '... (truncated)' : ''}`

  let attempt = 0
  let lastError: Error | null = null

  while (attempt < maxRetries) {
    try {
      attempt++
      console.log(`[DeadlineExtractor] AI extraction attempt ${attempt}/${maxRetries} for ${regulationTitle}`)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Low temperature for consistent extraction
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      // Parse JSON response
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim()
      let extractedDeadlines: AIDeadlineExtraction[] = []

      try {
        extractedDeadlines = JSON.parse(cleanedContent)
      } catch {
        console.error('[DeadlineExtractor] Failed to parse AI response:', cleanedContent)
        throw new Error('Invalid JSON response from AI')
      }

      // Transform AI response to Deadline format
      const deadlines: Partial<Deadline>[] = extractedDeadlines.map((extracted) => ({
        deadlineDate: new Date(extracted.deadlineDate),
        deadlineType: extracted.deadlineType,
        description: extracted.description,
        riskLevel: extracted.riskLevel as RiskLevel,
        extractionConfidence: extracted.confidence || 0.8,
        notificationSent: false,
      }))

      // Log cost estimate
      const tokens = data.usage?.total_tokens || 0
      const estimatedCost = (tokens * 0.0000015).toFixed(4) // GPT-3.5-turbo pricing
      console.log(`[DeadlineExtractor] AI extraction complete. Tokens: ${tokens}, Cost: ~$${estimatedCost}`)

      // Cache successful result
      saveToCache(cacheKey, deadlines)

      return deadlines
    } catch (error) {
      lastError = error as Error
      console.error(`[DeadlineExtractor] Attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  // All retries failed
  console.error('[DeadlineExtractor] All AI extraction attempts failed:', lastError)
  throw lastError || new Error('AI extraction failed')
}

/**
 * Simple in-memory cache for AI extractions
 * In production, use Redis or similar
 */
const extractionCache = new Map<string, Partial<Deadline>[]>()

function getFromCache(key: string): Partial<Deadline>[] | null {
  return extractionCache.get(key) || null
}

function saveToCache(key: string, value: Partial<Deadline>[]): void {
  extractionCache.set(key, value)
  
  // Clear cache after 1 hour to prevent memory leak
  setTimeout(() => {
    extractionCache.delete(key)
  }, 60 * 60 * 1000)
}

/**
 * Validate a deadline meets business rules
 * 
 * Rules:
 * - Date must be valid
 * - Date must not be in the past (can be today)
 * - Date must not be more than 10 years in the future
 * - deadlineType must be non-empty
 * 
 * @param deadline - Deadline to validate
 * @returns true if valid, false otherwise
 */
export function validateDeadline(deadline: Partial<Deadline>): boolean {
  try {
    // Check deadline date exists and is valid
    if (!deadline.deadlineDate) {
      return false
    }

    const date = new Date(deadline.deadlineDate)
    
    // Check for invalid date
    if (isNaN(date.getTime())) {
      return false
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0) // Reset to midnight

    const deadlineDay = new Date(date)
    deadlineDay.setHours(0, 0, 0, 0)

    // Check if date is in the past (allow today)
    if (deadlineDay < now) {
      return false
    }

    // Check if date is more than 10 years in future
    const tenYearsFromNow = new Date()
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10)
    if (date > tenYearsFromNow) {
      return false
    }

    // Check deadlineType is non-empty
    if (!deadline.deadlineType || deadline.deadlineType.trim() === '') {
      return false
    }

    return true
  } catch (error) {
    console.error('[DeadlineExtractor] Validation error:', error)
    return false
  }
}

/**
 * Categorize risk level based on deadline date and regulation context
 * 
 * Classification rules:
 * - CRITICAL: < 30 days OR contains penalty/fine/violation keywords
 * - IMPORTANT: 30-60 days
 * - ROUTINE: > 60 days
 * 
 * @param deadline - Deadline to categorize
 * @param regulationText - Full regulation text for keyword analysis
 * @returns Risk level (CRITICAL, IMPORTANT, or ROUTINE)
 */
export function categorizeRiskLevel(
  deadline: Partial<Deadline>,
  regulationText: string
): RiskLevel {
  const daysRemaining = calculateDaysRemaining(deadline.deadlineDate!)
  const lowerText = regulationText.toLowerCase()

  const config = DEFAULT_RISK_CATEGORIZATION

  // Check for critical keywords (penalties, violations, fines)
  const hasCriticalKeyword = config.criticalKeywords.some((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  )

  if (hasCriticalKeyword) {
    return 'CRITICAL'
  }

  // Check days remaining
  if (daysRemaining < config.criticalDaysThreshold) {
    return 'CRITICAL'
  }

  if (daysRemaining < config.importantDaysThreshold) {
    return 'IMPORTANT'
  }

  return 'ROUTINE'
}

/**
 * Calculate days remaining until deadline
 * 
 * @param deadlineDate - Deadline date (Date object or ISO string)
 * @returns Number of days remaining (negative if past due)
 */
export function calculateDaysRemaining(deadlineDate: Date | string): number {
  const deadline = new Date(deadlineDate)
  const now = new Date()

  // Reset both to midnight for accurate day calculation
  deadline.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Hybrid extraction: Try regex first, fall back to AI if needed
 * 
 * Strategy:
 * 1. Try regex extraction (fast, free)
 * 2. If < 2 results, try AI extraction (slower, costs money)
 * 3. Combine and deduplicate results
 * 
 * @param regulationText - Full regulation text
 * @param regulationTitle - Title for context
 * @returns Array of extracted deadlines with metadata
 */
export async function extractDeadlinesHybrid(
  regulationText: string,
  regulationTitle: string
): Promise<{
  deadlines: Partial<Deadline>[]
  method: 'regex' | 'ai' | 'hybrid'
}> {
  console.log('[DeadlineExtractor] Starting hybrid extraction for:', regulationTitle)

  // Step 1: Try regex extraction
  const regexCandidates = extractDatesWithRegex(regulationText)
  console.log(`[DeadlineExtractor] Regex found ${regexCandidates.length} candidates`)

  // If regex found enough high-confidence results, use those
  if (regexCandidates.length >= 2) {
    const deadlines: Partial<Deadline>[] = regexCandidates.map((candidate) => ({
      deadlineDate: candidate.date,
      deadlineType: inferDeadlineType(candidate.context),
      description: generateDescription(candidate.context),
      riskLevel: categorizeRiskLevel(
        { deadlineDate: candidate.date },
        regulationText
      ),
      extractionConfidence: candidate.confidence,
      notificationSent: false,
    }))

    return { deadlines, method: 'regex' }
  }

  // Step 2: Regex found < 2 results, try AI
  console.log('[DeadlineExtractor] Regex insufficient, trying AI extraction...')
  
  try {
    const aiDeadlines = await extractDeadlinesWithAI(regulationText, regulationTitle)
    console.log(`[DeadlineExtractor] AI found ${aiDeadlines.length} deadlines`)

    if (aiDeadlines.length > 0) {
      return { deadlines: aiDeadlines, method: 'ai' }
    }
  } catch (error) {
    console.error('[DeadlineExtractor] AI extraction failed:', error)
  }

  // Step 3: Return regex results even if < 2
  const deadlines: Partial<Deadline>[] = regexCandidates.map((candidate) => ({
    deadlineDate: candidate.date,
    deadlineType: inferDeadlineType(candidate.context),
    description: generateDescription(candidate.context),
    riskLevel: categorizeRiskLevel(
      { deadlineDate: candidate.date },
      regulationText
    ),
    extractionConfidence: candidate.confidence,
    notificationSent: false,
  }))

  return { deadlines, method: regexCandidates.length > 0 ? 'regex' : 'ai' }
}

/**
 * Infer deadline type from context
 */
function inferDeadlineType(context: string): string {
  const lower = context.toLowerCase()

  if (lower.match(/\b(submit|submission|file|filing)\b/)) return 'submission'
  if (lower.match(/\b(certif|attest)\b/)) return 'certification'
  if (lower.match(/\b(report|reporting)\b/)) return 'reporting'
  if (lower.match(/\b(implement|compliance|adopt)\b/)) return 'implementation'
  if (lower.match(/\b(pay|payment|fee)\b/)) return 'payment'

  return 'other'
}

/**
 * Generate description from context
 */
function generateDescription(context: string): string {
  // Clean up context
  let description = context.replace(/\s+/g, ' ').trim()

  // Limit length
  if (description.length > 200) {
    description = description.substring(0, 197) + '...'
  }

  return description || 'Compliance deadline'
}
