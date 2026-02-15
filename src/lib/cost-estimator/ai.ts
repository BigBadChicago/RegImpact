import OpenAI from 'openai';
import type {
  CompanyProfile,
  CostDriver,
  DepartmentCostBreakdown,
} from '../../types/cost-estimate';
import { CostCategory, Department } from '../../types/cost-estimate';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[CostEstimator] Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function extractCostDriversWithAI(
  regulationText: string,
  regulationTitle: string
): Promise<CostDriver[]> {
  const truncatedText =
    regulationText.length > 1500
      ? regulationText.substring(0, 1500) + '...'
      : regulationText;

  console.log(`[CostEstimator] AI extraction (~$0.002-0.004 cost)`);

  try {
    const response = await retryWithBackoff(() =>
      openai.chat.completions.create({
        model: 'gpt-4-turbo',
        temperature: 0.2,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: 'You are a regulatory compliance cost analyst. Extract cost drivers from regulations and output ONLY valid JSON.',
          },
          {
            role: 'user',
            content: `Analyze this regulation and identify all cost drivers (implementation requirements that have financial impact).

Regulation: ${regulationTitle}
Text: ${truncatedText}

For each cost driver, identify:
- category (LEGAL_REVIEW, SYSTEM_CHANGES, TRAINING, CONSULTING, AUDIT, PERSONNEL, INFRASTRUCTURE, OTHER)
- description (brief, specific)
- isOneTime (true/false)
- estimatedCost (USD, reasonable estimate)
- confidence (0-1)
- department (LEGAL, IT, HR, FINANCE, OPERATIONS, COMPLIANCE)

Respond ONLY with valid JSON:
{
  "drivers": [
    {
      "category": "SYSTEM_CHANGES",
      "description": "Data subject access request portal",
      "isOneTime": true,
      "estimatedCost": 35000,
      "confidence": 0.75,
      "department": "IT"
    }
  ]
}`,
          },
        ],
      })
    );

    const content = response.choices[0]?.message?.content || '{}';

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    return (parsed.drivers || []).map(
      (d: Record<string, unknown>, index: number) => ({
        id: `driver-ai-${index + 1}`,
        category: d.category as CostCategory,
        description: d.description as string,
        isOneTime: Boolean(d.isOneTime),
        estimatedCost: Number(d.estimatedCost),
        confidence: Number(d.confidence),
        department: d.department as Department,
      })
    );
  } catch (error) {
    console.error('[CostEstimator] AI extraction failed:', error);
    throw error;
  }
}

export async function allocateToDepartmentsWithAI(
  drivers: CostDriver[],
  profile: CompanyProfile,
  regulationTitle: string,
  baseBreakdown: DepartmentCostBreakdown[]
): Promise<DepartmentCostBreakdown[]> {
  try {
    console.log('[CostEstimator] AI department allocation (~$0.002-0.003 cost)');

    const response = await retryWithBackoff(() =>
      openai.chat.completions.create({
        model: 'gpt-4-turbo',
        temperature: 0.3,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'You are a compliance cost allocation expert. Refine cost driver allocation to departments based on regulation context and company profile. Output ONLY valid JSON.',
          },
          {
            role: 'user',
            content: `Regulation: ${regulationTitle}
Company: ${profile.industry} industry, ${profile.employeeCount} employees

Current allocation:
${JSON.stringify(baseBreakdown, null, 2)}

Based on the regulation requirements and company profile:
1. Are there alternative department allocations?
2. What specific tasks should each department perform?
3. What FTE breakdown makes sense?
4. What are key risks/sequencing concerns?

Respond with JSON:
{
  "refinements": [
    {
      "department": "IT|HR|LEGAL|COMPLIANCE|FINANCE|OPERATIONS",
      "allocationDetail": {
        "oneTimeTasks": ["task 1", "task 2"],
        "recurringTasks": ["task 1"],
        "fteSplit": {"Senior Engineer": 0.5, "Analyst": 0.3},
        "riskFactors": ["risk 1"],
        "sequencing": ["step 1", "step 2"]
      }
    }
  ]
}`,
          },
        ],
      })
    );

    const content = response.choices[0]?.message?.content || '{}';
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const refinements = parsed.refinements || [];

    const refinedBreakdown = baseBreakdown.map((dept) => {
      const refinement = refinements.find(
        (r: Record<string, unknown>) => r.department === dept.department
      );
      if (refinement?.allocationDetail) {
        return {
          ...dept,
          allocationDetail: refinement.allocationDetail,
        };
      }
      return dept;
    });

    console.log(
      `[CostEstimator] AI refined allocation for ${refinedBreakdown.length} departments`
    );

    return refinedBreakdown;
  } catch (error) {
    console.error('[CostEstimator] AI allocation failed, using base allocation:', error);
    return baseBreakdown;
  }
}
