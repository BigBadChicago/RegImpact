/**
 * AI Summarization Service
 * Uses OpenAI GPT-3.5-turbo to analyze regulation changes
 * Implements aggressive caching to minimize costs (~$0.002 per diff)
 */

import OpenAI from 'openai';
import {
  ChangeMetrics,
  PolicyDiffSummary,
  SignificanceScore,
} from '@/types/policydiff';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// In-memory cache for summarization results
const summaryCache = new Map<string, PolicyDiffSummary>();
const obligationsCache = new Map<string, string[]>();

/**
 * Create cache key from text input
 * @param text - Input text to hash
 * @returns Cache key
 */
function createCacheKey(text: string): string {
  // Simple hash: use first 100 chars + length as key
  return `${text.substring(0, 100)}_${text.length}`;
}

/**
 * Implement exponential backoff retry logic
 * @param fn - Async function to retry
 * @param maxRetries - Maximum retry attempts
 * @returns Result from function or throws after max retries
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(
          `Retry attempt ${attempt + 1} after ${delay}ms. Error: ${error}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Summarize regulation changes using AI
 * Note: Each call costs ~$0.001-0.002. Always check cache first.
 *
 * @param diffText - Unified diff or text of changes
 * @param regulationTitle - Title of the regulation being analyzed
 * @param maxRetries - Maximum retry attempts on failure
 * @returns PolicyDiffSummary with AI analysis
 */
export async function summarizeRegulationChanges(
  diffText: string,
  regulationTitle: string,
  maxRetries: number = 3
): Promise<PolicyDiffSummary> {
  const cacheKey = createCacheKey(diffText);

  // Check cache first
  if (summaryCache.has(cacheKey)) {
    console.log(`[Cache HIT] Returning cached summary for ${regulationTitle}`);
    return summaryCache.get(cacheKey)!;
  }

  console.log(
    `[Cache MISS] Generating new summary for ${regulationTitle} (~$0.001-0.002 cost)`
  );

  try {
    // Truncate diffText if too long to stay within token limits
    let processedDiffText = diffText;
    if (diffText.length > 2000) {
      processedDiffText = diffText.substring(0, 2000) + '\n... (truncated)';
    }

    const response = await retryWithBackoff(
      () =>
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a regulatory analyst helping CFOs understand regulation changes. Focus on business impact, not legal interpretation. Be concise and specific. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: `Analyze these regulation changes and provide a JSON response with:
1. "summary": 2-3 sentence executive summary
2. "keyChanges": array of 3-5 key changes (strings)
3. "obligations": array of new compliance obligations (strings)
4. "confidence": number between 0.7 and 0.95 indicating confidence in response

Regulation: ${regulationTitle}

Changes:
${processedDiffText}

Respond ONLY with valid JSON, no other text.`,
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      maxRetries
    );

    const content = response.choices[0]?.message?.content || '';
    console.log(`[AI Response] Tokens used: ${response.usage?.total_tokens}`);

    // Parse JSON response with error handling
    let parsed: { summary?: string; keyChanges?: string[]; obligations?: string[]; confidence?: number };
    try {
      // Strip markdown code blocks and trim whitespace
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*|\s*```$/g, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*|\s*```$/g, '');
      }
      
      // Find JSON object boundaries if there's extra text
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error(`[JSON Parse Error] Failed to parse AI response:`, parseError);
      console.error(`[Raw Content]:`, content);
      throw new Error(`Invalid JSON response from AI: ${parseError}`);
    }

    const summary: PolicyDiffSummary = {
      summary: parsed.summary || 'No summary available',
      keyChanges: Array.isArray(parsed.keyChanges) ? parsed.keyChanges : [],
      obligations: Array.isArray(parsed.obligations) ? parsed.obligations : [],
      confidence: Math.max(0.5, Math.min(0.95, parsed.confidence || 0.7)),
    };

    // Cache before returning
    summaryCache.set(cacheKey, summary);
    console.log(
      `[Cache STORE] Stored summary. Cache size: ${summaryCache.size}`
    );

    return summary;
  } catch (error) {
    console.error(
      `[Error] Failed to summarize changes for ${regulationTitle}:`,
      error
    );

    // Return generic summary on failure
    return {
      summary:
        'Unable to analyze changes at this time. Please try again later.',
      keyChanges: [],
      obligations: [],
      confidence: 0.5,
    };
  }
}

/**
 * Extract new compliance obligations from changes
 * Note: Each call costs ~$0.0005-0.001. Always check cache first.
 *
 * @param changedText - Text containing changed content
 * @param maxRetries - Maximum retry attempts
 * @returns Array of obligation strings
 */
export async function extractObligations(
  changedText: string,
  maxRetries: number = 3
): Promise<string[]> {
  const cacheKey = `obligations:${createCacheKey(changedText)}`;

  // Check cache first
  if (obligationsCache.has(cacheKey)) {
    console.log(`[Cache HIT] Returning cached obligations`);
    return obligationsCache.get(cacheKey)!;
  }

  console.log(`[Cache MISS] Extracting obligations (~$0.0005-0.001 cost)`);

  try {
    const response = await retryWithBackoff(
      () =>
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'Extract new compliance obligations from regulation changes. Return ONLY a valid JSON array of obligation strings, no other text.',
            },
            {
              role: 'user',
              content: `Extract all new compliance obligations from these changes:\n\n${changedText.substring(0, 1000)}`,
            },
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      maxRetries
    );

    const content = response.choices[0]?.message?.content || '';
    const obligations = JSON.parse(content) as string[];

    // Cache result
    obligationsCache.set(cacheKey, obligations);

    return Array.isArray(obligations) ? obligations : [];
  } catch (error) {
    console.error(`[Error] Failed to extract obligations:`, error);
    return [];
  }
}

/**
 * Calculate significance score based on metrics and summary
 * @param metrics - Change metrics
 * @param summary - AI-generated summary
 * @returns Significance score (HIGH, MEDIUM, LOW)
 */
export function calculateSignificance(
  metrics: ChangeMetrics,
  summary: PolicyDiffSummary
): SignificanceScore {
  // High-impact keywords
  const highImpactKeywords = [
    'penalty',
    'fine',
    'violation',
    'deadline',
    'prohibited',
    'mandatory',
    'required',
    'enforcement',
  ];

  const summaryText = `${summary.summary} ${summary.keyChanges.join(' ')}`.toLowerCase();
  const hasHighImpactKeyword = highImpactKeywords.some((kw) =>
    summaryText.includes(kw)
  );

  // High significance: >30% changed OR >4 key changes OR high-impact keywords
  if (
    metrics.percentageChanged > 30 ||
    summary.keyChanges.length > 4 ||
    hasHighImpactKeyword
  ) {
    return SignificanceScore.HIGH;
  }

  // Medium significance: >15% changed OR >2 key changes
  if (metrics.percentageChanged > 15 || summary.keyChanges.length > 2) {
    return SignificanceScore.MEDIUM;
  }

  // Low significance
  return SignificanceScore.LOW;
}

/**
 * Clear caches (useful for testing or manual refresh)
 */
export function clearCaches(): void {
  summaryCache.clear();
  obligationsCache.clear();
  console.log('[Cache] Cleared all caches');
}

/**
 * Get cache statistics
 * @returns Object with cache size information
 */
export function getCacheStats(): {
  summaryCount: number;
  obligationsCount: number;
} {
  return {
    summaryCount: summaryCache.size,
    obligationsCount: obligationsCache.size,
  };
}
