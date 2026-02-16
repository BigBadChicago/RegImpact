# RegImpact: AI Coding Agent Instructions

## Project Overview
**RegImpact** is a regulatory compliance tracking platform built with Next.js 16, React 19, PostgreSQL, and Prisma. It helps organizations monitor regulations, track deadlines, estimate costs, and manage approvals across federal, state, and local jurisdictions.

### Architecture Summary
- **Frontend**: Next.js App Router, React 19, TailwindCSS 4, Recharts/Visx for visualization
- **Backend**: Next.js API routes, TypeScript, Zod validation
- **Database**: PostgreSQL with Prisma ORM (`@prisma/adapter-pg`)
- **Auth**: NextAuth.js v5 (JWT strategy, GitHub + Credentials providers)
- **AI**: OpenAI integration for cost estimation and summarization
- **Email**: Resend for transactional notifications
- **Testing**: Vitest (unit/integration), Playwright (E2E)

---

## Critical Developer Commands

### Development & Build
```bash
npm run dev           # Start dev server on :3000
npm run build         # Build for production
npm start            # Start production server
```

### Testing
```bash
npm run test:all          # Unit + Integration + E2E (recommended for validation)
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e          # Playwright E2E tests (requires dev server running)
npm run test:watch        # Watch mode for development
npm run test:ui           # Vitest UI dashboard
npm run coverage          # Generate coverage report
```

### Linting & Database
```bash
npm run lint          # ESLint validation
npm run build         # Includes type checking
npx prisma migrate dev --name <migration_name>  # Create DB migrations
npm run postinstall   # Generate Prisma client
```

**Important**: When modifying the database, always create migrations: `npx prisma migrate dev --name your_change_name`

---

## Key Architecture Patterns

### 1. Authentication & Authorization
- **Auth config**: [src/auth.config.ts](src/auth.config.ts)
- **Session strategy**: JWT with 30-day max age
- **User context**: Attached to every request via NextAuth session
- **Protected routes**: Dashboard routes protected by middleware ([lib/middleware.ts](lib/middleware.ts) → matches `/dashboard/:path*`)
- **Roles**: `ADMIN`, `USER` (stored in token)
- **Per-customer isolation**: Users scoped to `customerId`

**Pattern**: Always check session before DB queries in API routes:
```typescript
const session = await auth()
if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})
```

### 2. Database Schema & Models
**Key entities** (see [prisma/schema.prisma](prisma/schema.prisma)):
- `Customer` (subscription tiers: STARTER, GROWTH, SCALE)
- `User` (belongs to Customer, has role)
- `Jurisdiction` (FEDERAL, STATE, LOCAL)
- `Regulation` (tracked policies with versions)
- `RegulationVersion` & `PolicyDiff` (change tracking)
- `Deadline` (risk levels: CRITICAL, IMPORTANT, ROUTINE)
- `CostEstimate` (AI-powered financial impact)
- `Alert`, `Approval`, `Comment` (notifications & workflows)
- `HealthScoreHistory` (compliance metrics)

**Pattern**: Always use Prisma client singleton from [src/lib/prisma.ts](src/lib/prisma.ts):
```typescript
import { prisma } from '@/lib/prisma'
```

### 3. API Route Structure
**All API routes use Next.js App Router pattern**:
```typescript
// src/app/api/[resource]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { z } from 'zod'

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params  // Required for dynamic routes
  const session = await auth()
  // Validate input with Zod
  // Query Prisma with per-customer filtering
  // Return NextResponse
}
```

**Validation pattern**: Use Zod schemas (example: [src/app/api/regulations/[id]/cost-estimate/route.ts](src/app/api/regulations/[id]/cost-estimate/route.ts#L19)):
```typescript
const schema = z.object({ key: z.string(), nested: z.object({...}) })
const result = schema.safeParse(body)
if (!result.success) return NextResponse.json({error: 'Invalid', details: result.error}, {status: 400})
```

### 4. Cost Estimation Service

**CRITICAL CONSTRAINT**: Minimize premium API requests and tokens. Closer to zero is better.

#### Architecture & Token Optimization
- **Location**: [src/lib/cost-estimator/](src/lib/cost-estimator/)
- **Cache-first pattern** ([cache.ts](src/lib/cost-estimator/cache.ts)): In-memory caches for cost drivers & estimates → **Zero API calls on cache hits**
  - Cache key: `regulations_text_substring(0,100)_text_length_suffix`
  - Check cache before ANY AI call: `getCachedDrivers(key)` or `getCachedEstimate(key)`
- **AI optional** ([core.ts](src/lib/cost-estimator/core.ts#L26)): `ENABLE_AI_COST_EXTRACTION=true` env var gates all OpenAI calls
  - When `false` (default): Uses deterministic pattern matching, **zero API calls**
  - When `true`: AI extraction only as fallback (see below)

#### Cost Driver Extraction (`extractCostDrivers()`)
**Workflow (in order of preference)**:
1. **Check cache**: Instant, zero cost
2. **Use deterministic extraction** ([extractCostDriversDeterministic](src/lib/cost-estimator/core.ts#L80)): Pattern matching for common keywords (portal, officer, training, audit, etc.) → **~0 tokens, ~0 cost**
3. **Fall back to AI** (if `ENABLE_AI_COST_EXTRACTION=true`): OpenAI gpt-4-turbo only if deterministic fails
   - **Token minimization**: Truncates regulation text to **1500 chars max** before sending
   - **Model**: gpt-4-turbo (no o1 or premium variants - use minimal reasoning)
   - **Temperature**: 0.2 (deterministic outputs, less token "waste")
   - **max_tokens**: 1500 (hard limit on response length)
   - **Retry logic**: Exponential backoff (2^attempt * 1000ms) up to 3 attempts
   - **Estimated cost**: $0.002-0.004 USD per successful call (~1500-3000 tokens total in+out)
   - **Pattern**: Catch failures gracefully, fall back to deterministic

**Example (code pattern)**:
```typescript
// ✅ CORRECT: Cache-aware, AI optional
const drivers = await extractCostDrivers(regulationText, title)
// Internally: checks cache → tries deterministic → AI fallback only if enabled

// ❌ WRONG: Calling AI directly
const drivers = await extractCostDriversWithAI(text, title)  // No cache check, always calls API
```

#### Other Functions
- **`calculateImplementationCost(drivers, profile)`** → Pure math, **zero API calls**, generates cost scenarios (pessimistic/realistic/optimistic)
- **`generateScenarios(costs)`** → Pure math, scenarios + sensitivity analysis, **zero API calls**
- **`applyLearningFeedback(estimate, actualCost)`** → Calibrates future estimates, **zero API calls**
- **`getCacheStats()`** → Inspection only, returns `{driverCacheSize, estimateCacheSize}`

#### When to Use AI Extraction
- Only enable `ENABLE_AI_COST_EXTRACTION=true` when:
  - Deterministic extraction misses critical drivers (logs show `[CostEstimator] Cache MISS`)
  - User explicitly requests AI-powered analysis
  - High-value regulations where precision > cost matters
- **Recommended**: Keep disabled in production; enable selectively for pilot users

#### Database Caching (Long-term)
- Estimates stored in DB `CostEstimate` model; persists across server restarts
- Client should check DB before re-generating: `prisma.costEstimate.findUnique({where: {regulationVersionId}})`
- Pattern: **DB cache > memory cache > API call**

### 5. Alert Generation System
- **Generator**: [src/lib/alerts/generator.ts](src/lib/alerts/generator.ts)
- **Detects**: Approaching deadlines (30d window), high-cost regulations (>$100k), budget variance (>10%), approval bottlenecks (>5 pending)
- **Cron endpoint**: [src/app/api/cron/alerts/route.ts](src/app/api/cron/alerts/route.ts)
- **Schedule**: Vercel cron, daily 7 AM UTC (configured in [vercel.json](vercel.json))
- **Pattern**: `generateAlertsForCustomer(id)` or `generateAlertsForAllCustomers()` callable from routes/crons

### 6. Email Notifications
- **Service**: Resend integration via [src/lib/email/](src/lib/email/)
- **Pattern**: Non-blocking fire-and-forget (`await sendEmail() .catch(err => console.error)`)
- **Examples**: Approval notifications, digest emails

### 7. Validation & Error Handling
- **Input validation**: Always use Zod schemas
- **Auth check**: Verify session exists and user has customerId
- **Customer isolation**: Always filter queries by customerId
- **Response format**: Consistent `{error: string, details?: unknown}` for errors

---

## Code Organization

### Import Paths
- Use alias `@/*` → `src/*` (configured in [tsconfig.json](tsconfig.json))
- Example: `import { prisma } from '@/lib/prisma'` not `import { prisma } from '../lib/prisma.ts'`

### Directory Structure
```
src/
  app/              # Next.js app router (pages + API routes)
  components/       # React components (organized by domain: alerts, approvals, etc.)
  lib/              # Business logic (cost-estimator, ai, alerts, analytics, email, etc.)
  types/            # TypeScript interfaces (cost-estimate.ts, dashboard.ts, policydiff.ts)
  auth.config.ts    # NextAuth configuration
prisma/             # Database schema, migrations, seed
lib/                # Legacy (use src/lib/* instead)
tests/              # Test suites (unit, integration, e2e)
```

### Testing Standards
- **Unit tests**: Mock external dependencies, focus on function logic
- **Integration tests**: Use real Prisma client with test DB
- **E2E tests**: Playwright, full user workflows
- **Coverage config**: [vitest.config.ts](vitest.config.ts) excludes boilerplate (layout.tsx, error.tsx) and NextAuth

---

## Common Task Examples

### Adding a New Regulation Feature
1. **Extend schema**: Add model/fields to [prisma/schema.prisma](prisma/schema.prisma)
2. **Migrate**: Run `npx prisma migrate dev --name feature_name`
3. **Type it**: Add TypeScript interface to [src/types/](src/types/)
4. **API route**: Create [src/app/api/regulations/route.ts](src/app/api/regulations/) with Zod validation
5. **Auth check**: Verify session, scope to customerId
6. **Test**: Write tests in [tests/](tests/)

### Modifying Authentication Flow
- **Config location**: [src/auth.config.ts](src/auth.config.ts)
- **Session shape**: Includes `userId`, `role`, `customerId`, `email` (see jwt/session callbacks)
- **Provider setup**: GitHub provider requires `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` env vars

### Adding Background Jobs
- **Cron endpoints**: [src/app/api/cron/](src/app/api/cron/)
- **Header validation**: Verify `X-Vercel-Cron-Secret` matches `CRON_SECRET` env var
- **Config**: Add schedule to [vercel.json](vercel.json)
- **Pattern**: Query all customers, run operation, send response with counts

---

## Type Safety & Conventions

### Zod Validation
- Always validate user input before database queries
- Use `.safeParse()` and handle `success: false` case
- Import from `zod` (already in package.json)

### Prisma Queries
- Use `include` for related data to avoid N+1 queries
- Filter by `customerId` for multi-tenant isolation
- Use `$transaction` for multi-step operations
- Don't use raw SQL unless absolutely necessary

### TypeScript
- **Strict mode enabled** - all files required to pass strict type checking
- Use inference when possible: `const user = await prisma.user.findUnique(...)`
- Avoid `any` and `as` casts

---

## Environment Setup

**Key environment variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` - OAuth
- `AUTH_SECRET` - NextAuth session encryption (generate: `openssl rand -base64 32`)
- `OPENAI_API_KEY` - For cost estimation/AI features
- `RESEND_API_KEY` - For email notifications
- `CRON_SECRET` - For verifying cron jobs

**Development**: Use `.env.local` (not committed)

---

## API & Token Budgeting

**GOLDEN RULE**: Every OpenAI API call costs ~$0.002-0.004. Minimize to approach **$0/month**. 

### Token Minimization Checklist
When implementing cost estimation features:
- ✅ **Always check cache first** before ANY API operation
- ✅ **Use deterministic extraction** as primary path; AI as fallback only
- ✅ **Truncate text <1500 chars** if sending to API (tokens = roughly text_length/4)
- ✅ **Use low temperature** (0.2) for consistency, avoid wasted tokens on randomness
- ✅ **Set max_tokens limit** to prevent runaway responses
- ✅ **Cache results in DB** after generation for next request
- ✅ **Disable AI in production** (`ENABLE_AI_COST_EXTRACTION=false`); enable selectively
- ✅ **Monitor cache hit rates**: Run `getCacheStats()` to verify caching works
- ✅ **Batch requests**: Process multiple regulations in parallel, not sequentially

### Example: Cost-Aware Implementation
```typescript
// ✅ EFFICIENT: ~0 tokens and $0 cost for 90% of requests
export async function getCostEstimate(id: string, profile: CompanyProfile) {
  // 1. Check DB cache (persisted across restarts)
  let estimate = await prisma.costEstimate.findUnique({where: {regulationVersionId: id}})
  if (estimate) return estimate; // DB hit: $0, 0 tokens

  // 2. Get drivers (memory cache + deterministic only)
  const regulation = await prisma.regulation.findUnique({where: {id}})
  const drivers = await extractCostDrivers(regulation.text, regulation.title)
  // Internal: checks memory cache, uses pattern matching → $0, ~0 tokens

  // 3. Pure math (zero API calls)
  const costs = calculateImplementationCost(drivers, profile)
  const scenarios = generateScenarios(costs)

  // 4. Persist to DB
  const result = await prisma.costEstimate.create({data: {...}})
  return result
}

// ❌ WASTEFUL: ~2000+ tokens and $0.003 per request
export async function getCostEstimateWasteful(id: string) {
  const regulation = await prisma.regulation.findUnique({where: {id}})
  // No cache check, direct API call
  const drivers = await extractCostDriversWithAI(regulation.text, regulation.title)
  // Every request hits API: $0.003 × 1000 requests/month = $3/month waste
}
```

### Token Budgeting Rules by Tier
- **STARTER**: 0 API calls/month (deterministic only)
- **GROWTH**: 10 API calls/month max (cached results, selective AI)
- **SCALE**: 50 API calls/month max (monitoring enabled)

---

## Performance Notes

- **Prisma caching**: Client singleton pattern prevents memory leaks during hot reload
- **Query limits**: Alert generator uses `take: 50` to bound result sets
- **Email batching**: `sendApprovalEmailsBatch()` for multiple emails
- **Parallel operations**: Use `Promise.all()` for independent DB queries (e.g., 4 alert types detected in parallel)
- **Cost estimator cache**: Two-level caching (in-memory + DB) minimizes token usage; check `getCacheStats()` periodically
- **API monitoring**: Watch server logs for `[CostEstimator]` patterns to detect when AI extraction is triggered

---

## When Something Breaks

1. **Type errors**: Run `npm run build` - caught at compile time
2. **DB version mismatch**: Ensure Prisma client matches schema: `npm run postinstall`
3. **Auth issues**: Check session token payload in [src/auth.config.ts](src/auth.config.ts) callbacks
4. **E2E test failures**: Dev server must be running (`npm run dev`) before `npm run test:e2e`
5. **Coverage drops**: Check [vitest.config.ts](vitest.config.ts) exclusion rules
6. **AI token overages**: 
   - Check logs for `[CostEstimator] Cache MISS` patterns - indicates new regulations requiring extraction
   - If AI enabled: Look for `[CostEstimator] AI extraction (~$0.002-0.004 cost)` - each means API call
   - Run `getCacheStats()` endpoint (if available) to see cache hit rates
   - Verify `ENABLE_AI_COST_EXTRACTION` is `false` in production, `true` only for testing
   - Review deterministic driver list in [core.ts line 80+](src/lib/cost-estimator/core.ts#L80) - may need keyword expansion for common regulations

---

## File References
- **Main config**: [next.config.ts](next.config.ts), [tsconfig.json](tsconfig.json), [vitest.config.ts](vitest.config.ts), [playwright.config.ts](playwright.config.ts)
- **Build output**: `.next/` (auto-generated, not committed)
- **Database**: [prisma/schema.prisma](prisma/schema.prisma)
- **Test setup**: [tests/setup.ts](tests/setup.ts)
