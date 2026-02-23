# RegImpact Platform: Comprehensive Context for Google Gemini

**Purpose**: This document provides complete context about the RegImpact regulatory compliance tracking platform for AI-assisted development with Google Gemini.

---

## 🎯 PROJECT OVERVIEW

### What is RegImpact?
RegImpact is a **regulatory compliance tracking platform** built with Next.js 16, React 19, PostgreSQL, and Prisma. It helps organizations monitor regulations, track deadlines, estimate costs, and manage approvals across federal, state, and local jurisdictions.

### Target Users
- **CFOs & Finance Teams**: Budget planning for compliance costs
- **Compliance Officers**: Deadline tracking and risk management
- **Operations Managers**: Cross-departmental coordination
- **Legal Teams**: Regulation change monitoring

### Business Model
SaaS with three tiers:
- **STARTER**: Basic tracking ($99/month)
- **GROWTH**: AI-powered insights ($299/month)
- **SCALE**: Enterprise features ($999/month)

---

## 🏗️ TECHNICAL ARCHITECTURE

### Technology Stack

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS 4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: Day.js (recently migrated from date-fns for 35 MB savings)

#### Backend
- **Runtime**: Node.js with TypeScript
- **API**: Next.js API routes (App Router pattern)
- **Validation**: Zod schemas
- **Authentication**: NextAuth.js v5 (JWT strategy, GitHub + Credentials providers)

#### Database
- **DBMS**: PostgreSQL
- **ORM**: Prisma with `@prisma/adapter-pg`
- **Connection**: Direct connection with connection pooling
- **Migrations**: Prisma Migrate

#### AI & Intelligence
- **Provider**: OpenAI (gpt-4-turbo)
- **Use Cases**: Cost estimation, text summarization (planned)
- **Cost Optimization**: Cache-first architecture, deterministic fallbacks
- **Token Budget**: ~$0/month target (deterministic preferred)

#### Email
- **Service**: Resend
- **Use Cases**: Transactional notifications, approval workflows, digests

#### Testing
- **Unit/Integration**: Vitest with happy-dom (recently migrated from jsdom for 70 MB savings)
- **E2E**: Playwright (Chromium, Firefox, WebKit, Mobile Chrome/Safari)
- **Mocking**: MSW (Mock Service Worker)
- **Test Data**: @faker-js/faker
- **Coverage**: Vitest coverage-v8

### Project Structure
```
regimpact/
├── prisma/
│   ├── schema.prisma           # Database schema with 15+ models
│   ├── migrations/             # Version-controlled DB changes
│   └── seed.ts                 # Test data generation
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes (REST-like endpoints)
│   │   ├── dashboard/          # Dashboard pages
│   │   └── login/              # Authentication pages
│   ├── components/             # React components (alerts, approvals, cost, dashboard, etc.)
│   ├── lib/                    # Business logic
│   │   ├── cost-estimator/     # AI-powered cost estimation
│   │   ├── alerts/             # Alert generation system
│   │   ├── analytics/          # Trend analysis
│   │   ├── email/              # Email notifications
│   │   └── export/             # PDF generation
│   ├── types/                  # TypeScript interfaces
│   └── auth.config.ts          # NextAuth configuration
├── tests/
│   ├── unit/                   # Pure function tests
│   ├── integration/            # API + DB tests
│   └── e2e/                    # Full user flow tests
└── docs/                       # Documentation
```

---

## 💾 DATABASE SCHEMA

### Core Models

#### Customer (Multi-tenant)
```prisma
model Customer {
  id               String            @id @default(cuid())
  name             String
  subscriptionTier SubscriptionTier  @default(STARTER)
  industry         String?
  companySize      Int?              // Number of employees
  geographicScope  String[]          // ["US", "CA", "EU"]
  users            User[]
  regulations      Regulation[]
  // ... relationships
}
```

#### User (Auth & Roles)
```prisma
model User {
  id         String   @id @default(cuid())
  email      String   @unique
  password   String   // bcrypt hashed
  name       String
  role       UserRole @default(USER)  // ADMIN | USER
  customerId String
  customer   Customer @relation(fields: [customerId])
  // ... relationships
}
```

#### Regulation (Tracked Policies)
```prisma
model Regulation {
  id           String       @id @default(cuid())
  title        String
  jurisdiction Jurisdiction  // FEDERAL | STATE | LOCAL
  category     String
  effectiveDate DateTime?
  customerId   String
  versions     RegulationVersion[]
  deadlines    Deadline[]
  // ... relationships
}
```

#### RegulationVersion (Change Tracking)
```prisma
model RegulationVersion {
  id           String     @id @default(cuid())
  versionNumber Int
  regulationId String
  text         String     @db.Text
  summary      String?    @db.Text
  publishedAt  DateTime
  effectiveAt  DateTime?
  diffs        PolicyDiff[]
  costEstimates CostEstimate[]
}
```

#### PolicyDiff (Version Comparison)
```prisma
model PolicyDiff {
  id              String            @id @default(cuid())
  oldVersionId    String
  newVersionId    String
  summary         String?           @db.Text
  keyChanges      String[]
  significance    SignificanceScore // HIGH | MEDIUM | LOW
  confidence      Float             // 0-1
  createdAt       DateTime          @default(now())
}
```

#### CostEstimate (Financial Impact)
```prisma
model CostEstimate {
  id                  String   @id @default(cuid())
  regulationVersionId String
  oneTimeCostLow      Float
  oneTimeCostHigh     Float
  recurringCostAnnual Float
  departmentBreakdown Json     // {HR: 10000, IT: 5000, ...}
  scenarioAnalysis    Json     // Pessimistic/Realistic/Optimistic
  confidence          Float    // 0-1
  approvals           Approval[]
}
```

#### Deadline (Compliance Tracking)
```prisma
model Deadline {
  id              String    @id @default(cuid())
  regulationId    String
  title           String
  description     String?   @db.Text
  deadlineDate    DateTime
  riskLevel       RiskLevel // CRITICAL | IMPORTANT | ROUTINE
  notificationSent Boolean  @default(false)
  alert           Alert?
}
```

#### Alert (Notifications)
```prisma
model Alert {
  id         String      @id @default(cuid())
  customerId String
  type       AlertType   // CRITICAL | WARNING | INFO
  category   String      // DEADLINE | COST | APPROVAL
  title      String
  message    String      @db.Text
  actionUrl  String?
  read       Boolean     @default(false)
  dismissed  Boolean     @default(false)
  createdAt  DateTime    @default(now())
}
```

#### Approval (Workflow)
```prisma
model Approval {
  id              String        @id @default(cuid())
  costEstimateId  String
  requesterId     String
  approverId      String
  status          ApprovalStatus // PENDING | APPROVED | REJECTED
  requestNote     String?       @db.Text
  approverNote    String?       @db.Text
  approvedAt      DateTime?
}
```

#### Comment (Collaboration)
```prisma
model Comment {
  id               String   @id @default(cuid())
  regulationId     String
  userId           String
  content          String   @db.Text
  parentId         String?  // For threading
  mentionedUserIds String[]
  createdAt        DateTime @default(now())
}
```

### Enums
- **SubscriptionTier**: STARTER | GROWTH | SCALE
- **UserRole**: ADMIN | USER
- **Jurisdiction**: FEDERAL | STATE | LOCAL
- **RiskLevel**: CRITICAL | IMPORTANT | ROUTINE
- **AlertType**: CRITICAL | WARNING | INFO
- **ApprovalStatus**: PENDING | APPROVED | REJECTED
- **SignificanceScore**: HIGH | MEDIUM | LOW

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### NextAuth Configuration (src/auth.config.ts)
- **Strategy**: JWT with 30-day max age
- **Providers**:
  - GitHub OAuth (requires `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`)
  - Credentials (email/password with bcrypt verification)
- **Session Shape**:
  ```typescript
  {
    user: {
      email: string
      userId: string
      role: UserRole
      customerId: string
    }
  }
  ```
- **Protected Routes**: `/dashboard/*` (via middleware)
- **Customer Isolation**: All queries filtered by `session.user.customerId`

### Security Patterns
1. **Session Check**: Every API route validates `await auth()`
2. **Customer Scoping**: All DB queries include `where: { customerId }`
3. **Role-Based Access**: Admin routes check `session.user.role === 'ADMIN'`
4. **Input Validation**: All API inputs validated with Zod schemas

---

## 🧠 COST ESTIMATION SYSTEM

### Architecture (src/lib/cost-estimator/)

#### Core Philosophy
**Minimize API calls and tokens. Closer to zero is better.**

#### Components

**1. Cache Layer (cache.ts)**
- In-memory Map-based caching
- Two caches: cost drivers + full estimates
- Cache key: `regulations_text_substring(0,100)_text_length_suffix`
- Zero API calls on cache hits

**2. Deterministic Extraction (core.ts)**
- Pattern matching for common keywords
- ~0 tokens, ~0 cost
- Primary extraction method
- Keywords: portal, officer, training, audit, report, etc.

**3. AI Extraction (ai.ts)**
- OpenAI gpt-4-turbo
- **Only when**: `ENABLE_AI_COST_EXTRACTION=true` (disabled by default)
- **Token minimization**: Text truncated to 1500 chars max
- **Temperature**: 0.2 (deterministic outputs)
- **max_tokens**: 1500 (hard limit)
- **Retry logic**: Exponential backoff (3 attempts)
- **Cost**: ~$0.002-0.004 per call

**4. Cost Calculation (core.ts)**
- Pure math, zero API calls
- Inputs: cost drivers + company profile
- Outputs: one-time costs + recurring costs
- Multipliers: industry, company size, geographic complexity, tech maturity

**5. Scenario Generation (core.ts)**
- Three scenarios: Pessimistic/Realistic/Optimistic
- Sensitivity analysis
- Zero API calls

**6. Department Allocation (ai.ts)**
- Distributes costs across departments (HR, IT, Legal, etc.)
- AI-powered or deterministic fallback
- Uses base allocation when AI unavailable

#### Workflow
```typescript
// 1. Check cache
const cachedDrivers = getCachedDrivers(key)
if (cachedDrivers) return cachedDrivers

// 2. Try deterministic
const drivers = extractCostDriversDeterministic(text)
if (drivers.length > 0) return drivers

// 3. Fallback to AI (if enabled)
if (ENABLE_AI_COST_EXTRACTION === 'true') {
  return await extractCostDriversWithAI(text, title)
}

// 4. Calculate costs (pure math)
const costs = calculateImplementationCost(drivers, profile)

// 5. Generate scenarios
const scenarios = generateScenarios(costs)
```

#### Token Budget by Tier
- **STARTER**: 0 API calls/month (deterministic only)
- **GROWTH**: 10 API calls/month max
- **SCALE**: 50 API calls/month max

---

## 🔔 ALERT GENERATION SYSTEM

### Generator (src/lib/alerts/generator.ts)

#### Alert Rules
```typescript
const ALERT_RULES = {
  deadlines: {
    windowDays: 30,      // Look ahead 30 days
    criticalDays: 7,     // Critical if < 7 days
    warningDays: 14      // Warning if < 14 days
  },
  highCost: {
    threshold: 100_000,  // Alert if > $100k
    years: 2             // Over 2-year horizon
  },
  budgetVariance: {
    thresholdPercent: 10 // Alert if >10% variance
  }
}
```

#### Alert Types
1. **Approaching Deadlines**: 30-day window, risk-based severity
2. **High-Cost Regulations**: >$100k estimated impact
3. **Budget Variance**: >10% deviation from estimates
4. **Approval Bottlenecks**: >5 pending approvals

#### Optimization
- **Bulk upsert**: Reduces individual inserts by 90%
- **Deduplication**: Avoids duplicate alerts
- **Cron schedule**: Daily at 7 AM UTC (Vercel cron)

---

## 📊 ANALYTICS & TRENDS

### Trend Calculations (src/lib/analytics/trends.ts)

#### Available Metrics
1. **Regulatory Velocity**: New regulations per month, change %
2. **Cost Trend**: Total exposure over time, 3-month rolling average
3. **Forecast**: Linear regression predictions (y = mx + b, R²)
4. **Health Score History**: 3-month compliance score trend
5. **Department Matrix**: Regulations × departments heat map
6. **Geographic Heat Map**: Regulations by US state

#### Implementation
- **Pure SQL aggregations**: No AI, fast queries
- **Date grouping**: Day.js for month/quarter formatting
- **Statistical models**: Simple linear regression for forecasting

---

## 📧 EMAIL NOTIFICATIONS

### Service (src/lib/email/)

#### Providers
- **Resend**: Primary transactional email service
- **API Key**: `RESEND_API_KEY` environment variable

#### Email Types
1. **Approval Notifications**: Sent when approval requested/completed
2. **Digest Emails**: Daily/weekly summaries (optimized queries)
3. **Alert Emails**: High-priority compliance alerts

#### Pattern
```typescript
// Fire-and-forget (non-blocking)
await sendEmail(...)
  .catch(err => console.error('Email failed:', err))
```

---

## 🧪 TESTING STRATEGY

### Test Pyramid

#### Unit Tests (tests/unit/)
- **Coverage**: 165 passing, 85 todo
- **Focus**: Pure functions, React components
- **Mocking**: Vi.mock for external dependencies
- **Tools**: Vitest + happy-dom + @testing-library/react

#### Integration Tests (tests/integration/)
- **Coverage**: 38 passing, 96 todo
- **Focus**: API routes + database interactions
- **Mocking**: Mock Prisma, MSW for external APIs
- **Tools**: Vitest with test database

#### E2E Tests (tests/e2e/)
- **Coverage**: 0 passing, 35 skipped (awaiting UI implementation)
- **Focus**: Full user workflows
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **Tools**: Playwright

### Test Files Organization
```
tests/
├── unit/
│   ├── lib/
│   │   ├── cost-estimator.test.ts (37 tests passing)
│   │   ├── policydiff.test.ts (23 tests todo)
│   │   └── ai/summarizer.test.ts (33 tests todo)
│   ├── components/
│   │   ├── regulations/DiffViewer.test.tsx (17 tests todo)
│   │   └── dashboard/MetricCard.test.tsx (12 tests todo)
│   └── app/
│       └── login/page.test.tsx (6 tests passing)
├── integration/
│   ├── api/
│   │   ├── cost-estimate.test.ts (48 tests todo)
│   │   ├── dashboard.test.ts (9 tests todo)
│   │   └── [others].test.ts (38 passing, 48 todo)
│   └── auth/
│       └── login.test.ts (10 tests todo)
└── e2e/
    ├── dashboard.spec.ts (2 tests skipped)
    ├── policydiff.spec.ts (2 tests skipped)
    └── mobile.spec.ts (3 tests skipped)
```

### Test Commands
```bash
npm run test:unit           # Unit tests with coverage
npm run test:integration    # Integration tests
npm run test:e2e            # Playwright E2E
npm run test:all            # Full test suite
npm run test:watch          # Watch mode
npm run test:ui             # Vitest UI dashboard
npm run coverage            # Generate coverage report
```

---

## 📦 IMPLEMENTED FEATURES (Currently Working)

### ✅ Authentication
- NextAuth v5 with GitHub + Credentials
- JWT session management
- Protected routes via middleware
- Role-based access (ADMIN/USER)

### ✅ Cost Estimation (Partial)
- Deterministic cost driver extraction
- AI-powered extraction (optional)
- Cost calculation with company profile
- Scenario analysis (pessimistic/realistic/optimistic)
- Department allocation
- Caching system (memory + DB)

### ✅ Alert Generation
- Approaching deadline detection
- High-cost regulation flagging
- Budget variance monitoring
- Approval bottleneck detection
- Bulk alert creation

### ✅ Analytics
- Regulatory velocity tracking
- Cost trend analysis
- Health score calculation
- Department matrix visualization
- Geographic heat maps

### ✅ Email Notifications
- Approval workflow emails
- Alert notifications
- Digest email generation

### ✅ API Routes (Implemented)
- `/api/activity` - Activity feed
- `/api/alerts` - Alerts CRUD
- `/api/analytics` - Trend data
- `/api/approvals` - Approval workflows
- `/api/comments` - Comment system
- `/api/cron/alerts` - Alert generation cron
- `/api/cron/digest` - Digest email cron

### ✅ UI Components (Implemented)
- AlertCenter.tsx - Alert display
- ApprovalFlow.tsx - Approval workflow
- CommentThread.tsx - Threaded comments
- Cost breakdown tables
- Dashboard widgets (HealthScoreGauge, CostWaterfall, etc.)

### ✅ Testing Infrastructure
- Vitest configuration
- Playwright configuration
- MSW mock server
- Test fixtures and helpers
- Coverage reporting

---

## 🚧 MISSING FEATURES (To Be Implemented)

See **MISSING_FEATURES_ANALYSIS.md** for comprehensive breakdown.

### Critical Path (MVP)
1. **Authentication Flow Tests** (10 tests) - Week 1, Day 1
2. **Dashboard API** (16 tests) - Week 1, Days 2-3
3. **Policy Diff System** (38 tests) - Week 2, Days 4-6
4. **Cost Estimate API** (48 tests) - Week 3, Days 13-17

### High Value
5. **AI Summarizer** (33 tests) - Week 3, Days 8-12
6. **DiffViewer Component** (17 tests) - Week 2, Day 7

### Medium Priority
7. **Cost Feedback Learning Loop** (16 tests) - Week 4, Days 18-21
8. **Dashboard API** (9 tests) - Remaining dashboard endpoints

### Low Priority
9. **MetricCard Component** (12 tests) - Week 1, Day 3 (afternoon)
10. **Mobile Responsiveness** (3 tests) - Week 4, Day 22

### Total Implementation Effort
- **193 tests to implement**
- **22 days** (single developer)
- **~32,000 tokens** estimated
- **19-31 premium AI requests** estimated

---

## 💡 FUTURE INNOVATION IDEAS

### Phase 5: Advanced Analytics (Months 2-3)

#### 1. Predictive Compliance Risk Scoring
- **ML model**: Train on historical violation data
- **Inputs**: Regulation complexity, deadline proximity, historical adherence
- **Output**: Risk score (0-100) with confidence interval
- **Value**: Proactive risk mitigation, resource prioritization

#### 2. Intelligent Deadline Optimization
- **Algorithm**: Critical path optimization for overlapping deadlines
- **Features**: Suggest deadline extensions, resource reallocation
- **Integration**: Calendar export with optimized schedule
- **Value**: Reduces deadline stress, improves compliance rates

#### 3. Competitive Benchmarking
- **Data**: Anonymous aggregate data across customers (opt-in)
- **Metrics**: Industry-specific compliance costs, deadline adherence
- **Dashboard**: Compare against industry peers
- **Value**: Justify budgets, identify optimization opportunities

#### 4. Regulation Change Prediction
- **Data sources**: Congressional bills, agency notices, state legislature feeds
- **NLP**: Extract likely timeline, impact scope
- **Alert**: "Regulation X may affect you in 6-12 months"
- **Value**: Early preparation, strategic advantage

### Phase 6: Workflow Automation (Months 3-4)

#### 5. Automated Compliance Checklist Generation
- **Input**: Regulation text + company profile
- **Output**: Step-by-step compliance checklist with owners, deadlines
- **Features**: Task assignment, progress tracking, Slack/Teams integration
- **Value**: Reduces implementation time by 50%

#### 6. Smart Document Assembly
- **Templates**: Policy templates, employee notices, board reports
- **Auto-fill**: Populate with regulation details, cost estimates, deadlines
- **Export**: PDF, Word, Google Docs
- **Value**: Saves 2-4 hours per regulation

#### 7. Multi-Language Support
- **Translation**: Regulation summaries in Spanish, French, German, Chinese
- **Use case**: Multinational companies, diverse workforces
- **Implementation**: DeepL API or GPT-4 with translation prompts
- **Value**: Global expansion, accessibility

#### 8. Voice-Activated Queries
- **Integration**: Alexa/Google Assistant skills
- **Queries**: "What deadlines are due this week?"
- **Responses**: Voice summaries, SMS/email follow-ups
- **Value**: Executive convenience, mobile accessibility

### Phase 7: Enterprise Features (Months 4-6)

#### 9. Audit Trail & Compliance Reporting
- **Feature**: Immutable log of all user actions, approvals, cost changes
- **Reports**: SOC 2, ISO 27001 compliance reports
- **Export**: CSV, PDF with digital signatures
- **Value**: Pass audits, demonstrate due diligence

#### 10. Advanced Role-Based Access Control (RBAC)
- **Roles**: Viewer, Contributor, Approver, Admin, Super Admin
- **Permissions**: Granular (read/write/approve per regulation, department)
- **Audit**: Log all permission changes
- **Value**: Enterprise security, segregation of duties

#### 11. White-Label & Multi-Tenant SaaS
- **Feature**: Agencies can resell RegImpact under their brand
- **Customization**: Logo, colors, domain, email templates
- **Billing**: Integrated Stripe subscription management
- **Value**: B2B2B revenue stream

#### 12. API & Webhook Platform
- **Public API**: RESTful API for third-party integrations
- **Webhooks**: Notify external systems on regulation changes, deadline alerts
- **Use cases**: ERP integration, custom dashboards, compliance software suites
- **Value**: Ecosystem growth, enterprise adoption

### Phase 8: AI-Powered Intelligence (Months 6-9)

#### 13. Regulation Sentiment Analysis
- **Analysis**: Detect punitive language, enforcement trends
- **Score**: Severity score (0-10) for each regulation
- **Alert**: "This regulation has aggressive enforcement language"
- **Value**: Risk prioritization, legal strategy

#### 14. Natural Language Querying
- **Interface**: ChatGPT-style interface for platform
- **Queries**: "Show me all OSHA regulations affecting manufacturing"
- **Responses**: Structured data + natural language summaries
- **Value**: Non-technical user accessibility

#### 15. Regulation Impact Simulation
- **Input**: Proposed regulation text (bill/draft)
- **Simulation**: Estimate cost, departments affected, timeline
- **Output**: "If this passes, expect $250k cost over 2 years"
- **Value**: Strategic planning, advocacy efforts

#### 16. Auto-Assignment & Smart Routing
- **ML model**: Learn which departments/users handle specific regulations
- **Feature**: Auto-assign new regulations to right people
- **Notifications**: Email/Slack with context
- **Value**: Reduces manual triage by 80%

### Phase 9: Integrations & Ecosystem (Months 9-12)

#### 17. Calendar Integration
- **Platforms**: Google Calendar, Outlook, Apple Calendar
- **Features**: Sync deadlines, reminders, compliance events
- **Two-way**: Update in RegImpact or calendar
- **Value**: Centralized deadline management

#### 18. Slack/Teams Bot
- **Commands**: `/regimpact deadlines`, `/regimpact costs`
- **Notifications**: Alert channels for critical deadlines
- **Interactive**: Approve costs directly in Slack
- **Value**: Developer/team-friendly workflow

#### 19. ERP/HRIS Integration
- **Platforms**: SAP, Workday, Oracle, BambooHR
- **Data sync**: Employee counts, department structures, budgets
- **Use case**: Auto-update company profiles for cost estimation
- **Value**: Eliminates manual data entry

#### 20. Compliance Management System (CMS) Connectors
- **Partners**: LogicManager, OneTrust, ServiceNow GRC
- **Sync**: Regulations, deadlines, cost estimates
- **Value**: Best-of-breed ecosystem

### Phase 10: Advanced Visualizations (Months 12+)

#### 21. 3D Regulation Network Graph
- **Visualization**: Interactive 3D graph of regulation dependencies
- **Features**: Zoom, filter by department/jurisdiction
- **Use case**: Understand cascading compliance requirements
- **Value**: Strategic insights, complexity management

#### 22. Augmented Reality (AR) Compliance Dashboard
- **Platform**: HoloLens, Magic Leap
- **Use case**: Walk through virtual compliance dashboard
- **Features**: Spatial charts, gesture controls
- **Value**: Executive presentations, innovation showcase

#### 23. Blockchain-Based Audit Trails
- **Technology**: Ethereum or private blockchain
- **Use case**: Immutable record of compliance actions
- **Value**: Ultimate audit protection, regulatory acceptance

---

## 🛠️ DEVELOPMENT WORKFLOW

### Environment Setup
```bash
# 1. Clone repository
git clone https://github.com/your-org/regimpact.git
cd regimpact

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with:
# - DATABASE_URL (PostgreSQL)
# - AUTH_SECRET (openssl rand -base64 32)
# - AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (GitHub OAuth)
# - OPENAI_API_KEY (optional, for AI features)
# - RESEND_API_KEY (for emails)

# 4. Initialize database
npx prisma migrate dev
npx prisma db seed

# 5. Start development server
npm run dev
# Open http://localhost:3000
```

### Development Commands
```bash
npm run dev           # Start dev server on :3000
npm run build         # Build for production (includes type checking)
npm start             # Start production server
npm run lint          # ESLint validation
npm run test:all      # Run full test suite
npm run coverage      # Generate coverage report
```

### Database Management
```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```

### Coding Standards
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier (recommended)
- **Imports**: Use `@/` alias for `src/*`
- **API Routes**: Always validate with Zod
- **Auth**: Always check session, scope by customerId
- **Tests**: Write tests for new features before implementation (TDD)

---

## 🔑 ENVIRONMENT VARIABLES

### Required
```env
DATABASE_URL=postgresql://user:password@localhost:5432/regimpact
AUTH_SECRET=your-secret-key-here
```

### Optional (Auth)
```env
AUTH_GITHUB_ID=your-github-oauth-client-id
AUTH_GITHUB_SECRET=your-github-oauth-client-secret
```

### Optional (AI)
```env
OPENAI_API_KEY=sk-...
ENABLE_AI_COST_EXTRACTION=false  # Set to 'true' to enable AI (costs money)
```

### Optional (Email)
```env
RESEND_API_KEY=re_...
```

### Optional (Cron)
```env
CRON_SECRET=your-cron-secret  # For Vercel cron authentication
```

---

## 📝 COMMON TASKS FOR GEMINI

### Task 1: Implement a New Feature
**Example**: "Implement the Policy Diff System (38 tests)"

**Steps**:
1. Read test file: `tests/unit/lib/policydiff.test.ts`
2. Review existing skeleton: `src/lib/policydiff.ts`
3. Implement functions to pass tests:
   - `generateTextDiff(oldText, newText)`
   - `categorizeChanges(diffResult)`
   - `calculateChangeMetrics(diffResult)`
   - `determineSignificance(metrics, text)`
4. Run tests: `npm run test:unit -- policydiff`
5. Fix failing tests iteratively
6. Remove `.todo()` from passing tests

**Context needed**:
- Existing code patterns in `src/lib/`
- Prisma schema for `PolicyDiff` model
- Test expectations from `.test.ts` file

### Task 2: Fix a Bug
**Example**: "Cost estimation AI token usage is too high"

**Steps**:
1. Review cost estimator code: `src/lib/cost-estimator/`
2. Check caching logic: `cache.ts`
3. Verify deterministic extraction runs first: `core.ts`
4. Check AI extraction is only fallback: `ai.ts`
5. Add more logging: `[CostEstimator]` prefix
6. Test with: `npm run test:unit -- cost-estimator`

**Context needed**:
- Token minimization architecture
- Caching strategy
- Deterministic vs AI extraction flow

### Task 3: Add a New API Route
**Example**: "Implement GET /api/regulations"

**Steps**:
1. Create file: `src/app/api/regulations/route.ts`
2. Import dependencies:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { auth } from '@/auth.config'
   import { prisma } from '@/lib/prisma'
   import { z } from 'zod'
   ```
3. Implement GET handler:
   - Check session
   - Validate query params with Zod
   - Query Prisma with `customerId` filter
   - Return JSON response
4. Add integration tests: `tests/integration/api/regulations.test.ts`
5. Test with: `npm run test:integration`

**Context needed**:
- API route patterns (see existing routes in `src/app/api/`)
- Authentication check pattern
- Zod validation examples
- Prisma query patterns

### Task 4: Optimize Performance
**Example**: "Dashboard API is slow (>2s response time)"

**Steps**:
1. Identify slow queries (check Prisma logs)
2. Add database indexes to `schema.prisma`
3. Use `prisma.$transaction` for parallel queries
4. Implement caching (Redis or in-memory)
5. Add query batching where possible
6. Profile with: `console.time('query-name')`

**Context needed**:
- Current query patterns
- Database schema and relationships
- Caching infrastructure (if any)

### Task 5: Write Tests
**Example**: "Add tests for Alert Generator"

**Steps**:
1. Create test file: `tests/unit/lib/alerts/generator.test.ts`
2. Import dependencies:
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'vitest'
   import { generateAlertsForCustomer } from '@/lib/alerts/generator'
   ```
3. Mock Prisma:
   ```typescript
   vi.mock('@/lib/prisma', () => ({
     prisma: {
       deadline: { findMany: vi.fn() },
       alert: { upsert: vi.fn() }
     }
   }))
   ```
4. Write test cases:
   - Happy path
   - Edge cases
   - Error handling
5. Run tests: `npm run test:unit`

**Context needed**:
- Vitest testing patterns
- Mocking strategies (see `tests/setup.ts`)
- Example tests in `tests/unit/`

---

## 📚 KEY FILES TO REFERENCE

### Must-Read Files
1. **`.github/copilot-instructions.md`** - Core development rules
2. **`prisma/schema.prisma`** - Database schema (single source of truth)
3. **`src/auth.config.ts`** - Authentication logic
4. **`src/lib/cost-estimator/core.ts`** - Cost estimation algorithms
5. **`tests/setup.ts`** - Test configuration and mocking

### Architecture Documentation
- **`docs/PHASE3_COMPLETION.md`** - Implementation progress
- **`docs/PHASE3_EXTENDED.md`** - Extended features
- **`docs/PHASE3_OPTIMIZED.md`** - Performance optimizations
- **`docs/MISSING_FEATURES_ANALYSIS.md`** - Feature roadmap (this document)

### Configuration Files
- **`next.config.ts`** - Next.js configuration
- **`vitest.config.ts`** - Test configuration
- **`playwright.config.ts`** - E2E test configuration
- **`tsconfig.json`** - TypeScript configuration
- **`package.json`** - Dependencies and scripts

---

## 🤝 WORKING WITH GEMINI

### Best Practices

#### 1. Always Read Context First
Before implementing, read:
- Relevant test files
- Existing implementation (if any)
- Related files in same directory
- Database schema (if DB-related)

#### 2. Follow Existing Patterns
- Match code style of surrounding files
- Use same import patterns
- Follow same error handling approach
- Maintain consistent naming conventions

#### 3. Implement Incrementally
- Start with simplest test case
- Make it pass
- Move to next test
- Refactor when all tests pass

#### 4. Validate Continuously
- Run tests after each change: `npm run test:unit -- filename`
- Check types: `npm run build`
- Check lint: `npm run lint`

#### 5. Ask for Clarification
If ambiguous:
- "Should this API route require admin role?"
- "Should costs be cached in DB or memory?"
- "Is this feature enabled by default?"

### Common Pitfalls to Avoid

❌ **Don't**: Implement without reading tests  
✅ **Do**: Read test expectations first

❌ **Don't**: Skip authentication checks  
✅ **Do**: Always validate session and scope by customerId

❌ **Don't**: Use `any` types  
✅ **Do**: Use proper TypeScript types or `unknown` + type guards

❌ **Don't**: Make direct API calls in tests  
✅ **Do**: Mock external services (OpenAI, Resend, etc.)

❌ **Don't**: Commit `.env.local` or secrets  
✅ **Do**: Use `.env.example` templates

❌ **Don't**: Write SQL directly  
✅ **Do**: Use Prisma queries

❌ **Don't**: Skip customer isolation  
✅ **Do**: Always filter by customerId

❌ **Don't**: Enable AI features by default  
✅ **Do**: Use deterministic methods first, AI as fallback

### Helpful Prompts for Gemini

**Understanding codebase**:
```
"Explain the cost estimation workflow in RegImpact, focusing on 
cache-first architecture and token minimization."

"Show me all API routes that handle regulation data and their 
authentication patterns."

"What is the relationship between Regulation, RegulationVersion, 
and PolicyDiff models?"
```

**Implementing features**:
```
"Implement the Policy Diff System following the test specifications 
in tests/unit/lib/policydiff.test.ts. Use the existing `diff` library 
and maintain cache-first architecture."

"Create the Dashboard API endpoint at /api/dashboard following the 
pattern in other API routes. Include authentication, Zod validation, 
and customer scoping."
```

**Debugging**:
```
"The cost estimator is making too many API calls. Review the caching 
logic and ensure deterministic extraction runs before AI fallback."

"Integration tests for /api/activity are failing. Review the mock 
setup and ensure Prisma is properly mocked."
```

**Optimizing**:
```
"Review the alert generation system and suggest optimizations to 
reduce query count. Consider bulk operations and caching."

"The dashboard page loads slowly. Profile the API routes and suggest 
parallel query strategies."
```

---

## 📊 SUCCESS METRICS

### Technical Metrics
- **Test Coverage**: >90% for implemented features
- **Type Safety**: 100% (no `any` types)
- **Build Time**: <2 minutes
- **API Response Time**: <500ms (p95)
- **Database Query Time**: <100ms (p95)
- **Zero Security Vulnerabilities**: `npm audit` clean

### Business Metrics
- **AI Token Cost**: <$10/month (target: $0/month)
- **Uptime**: >99.9%
- **Customer Onboarding**: <5 minutes
- **Time to First Value**: <15 minutes
- **Cost Estimation Accuracy**: ±15% (after learning loop)

### User Experience Metrics
- **Dashboard Load Time**: <2s
- **Mobile Responsiveness**: 100% Lighthouse score
- **Accessibility**: WCAG 2.1 AA compliance
- **User Satisfaction**: >4.5/5 stars

---

## 🎓 CONCLUSION

This document provides comprehensive context for Google Gemini to understand the RegImpact platform architecture, implemented features, missing features, and future innovation opportunities.

**Key Takeaways**:
1. **RegImpact** tracks regulatory compliance with AI-powered cost estimation
2. **Tech Stack**: Next.js 16, React 19, PostgreSQL, Prisma, NextAuth, OpenAI
3. **Core Value**: Saves CFOs/compliance teams time and money
4. **Current Status**: 203/250 tests passing (81% of implemented features)
5. **Next Steps**: Implement 193 missing tests over 22 days
6. **Philosophy**: Token minimization, cache-first, deterministic-first
7. **Innovation Pipeline**: 20+ ideas for future features

**Use this document to**:
- Understand the full context of RegImpact
- Implement missing features following established patterns
- Debug issues by referencing architecture
- Propose new features aligned with platform goals
- Optimize performance while maintaining token efficiency

---

**Document Version**: 1.0  
**Last Updated**: February 16, 2026  
**Author**: RegImpact Development Team  
**Purpose**: Google Gemini Context for AI-Assisted Development
