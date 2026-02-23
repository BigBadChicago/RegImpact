# RegImpact: Missing Features Analysis

**Generated**: February 16, 2026  
**Test Suite Analysis**: 193 unimplemented tests across unit, integration, and E2E suites

---

## 🎯 MISSING FEATURES BY VALUE TO PLATFORM (Most → Least)

### 1. Cost Estimate API (48 tests) - CRITICAL
**Full cost estimation workflow with AI integration, caching, department breakdown, scenario analysis**
- **Business Impact**: Core revenue feature, enables pricing tiers
- **User Impact**: Primary value proposition for compliance budget planning
- **Test Coverage**: POST/GET endpoints, AI integration, caching, learning feedback
- **Location**: `tests/integration/api/cost-estimate.test.ts`

### 2. Policy Diff System (38 tests) - CRITICAL  
**Regulation version comparison with change detection, significance scoring**
- **Business Impact**: Key differentiator from competitors
- **User Impact**: Saves hours of manual regulation tracking
- **Test Coverage**: Text diffing, change metrics, significance calculation
- **Location**: `tests/unit/lib/policydiff.test.ts`, `tests/e2e/policydiff.spec.ts`

### 3. Authentication Flow (10 tests) - CRITICAL
**Complete login/session/JWT/role-based access control**
- **Business Impact**: Security, multi-tenancy isolation
- **User Impact**: Platform won't function without it
- **Test Coverage**: Credentials auth, session management, protected routes
- **Location**: `tests/integration/auth/login.test.ts`

### 4. Dashboard API (16 tests) - HIGH
**Data aggregation for executive dashboard (metrics, deadlines, risk exposure)**
- **Business Impact**: First impression, retention driver
- **User Impact**: Daily portal entry point
- **Test Coverage**: Metrics calculation, data scoping, error handling
- **Location**: `tests/integration/api/dashboard.test.ts`

### 5. AI Summarizer (33 tests) - HIGH
**Generate regulation change summaries, extract obligations, calculate significance**
- **Business Impact**: Reduces token costs, improves accuracy
- **User Impact**: Faster understanding of regulatory impact
- **Test Coverage**: OpenAI integration, caching, retry logic, token tracking
- **Location**: `tests/unit/lib/ai/summarizer.test.ts`

### 6. Cost Feedback Learning Loop (16 tests) - MEDIUM
**Tracks actual vs estimated costs, improves future predictions**
- **Business Impact**: Increases trust, reduces churn
- **User Impact**: More accurate cost estimates over time
- **Test Coverage**: Variance tracking, learning algorithms, confidence bands
- **Location**: `tests/integration/api/cost-feedback.test.ts`

### 7. DiffViewer Component (17 tests) - MEDIUM
**UI for split/unified diff view with syntax highlighting**
- **Business Impact**: Enables policy diff feature usability
- **User Impact**: Visual clarity for regulation changes
- **Test Coverage**: Split/unified modes, view toggle, styling, responsive design
- **Location**: `tests/unit/components/regulations/DiffViewer.test.tsx`

### 8. MetricCard Component (12 tests) - LOW
**Dashboard metric display with trend indicators**
- **Business Impact**: Aesthetic, not functional blocker
- **User Impact**: Cleaner dashboard presentation
- **Test Coverage**: Trend indicators, styling, ARIA labels
- **Location**: `tests/unit/components/dashboard/MetricCard.test.tsx`

### 9. Mobile Responsiveness (3 tests) - LOW
**Responsive layout for mobile devices (375px, 768px, 1024px)**
- **Business Impact**: Expands addressable market
- **User Impact**: Access on-the-go
- **Test Coverage**: Hamburger menu, vertical stacking, multi-viewport
- **Location**: `tests/e2e/mobile.spec.ts`

---

## ⚡ MISSING FEATURES BY EASE OF IMPLEMENTATION (Easiest → Hardest)

### TIER 1: Quick Wins (1-2 days, minimal tokens)

#### 1. MetricCard Component (12 tests) - 2-4 hours
- Simple React component, no AI/DB logic
- **Tokens**: ~500 (reading examples)
- **Premium requests**: 0
- **Dependencies**: None
- **Implementation**: Basic props, CSS styling, trend indicators

#### 2. Mobile Responsiveness (3 tests) - 4-6 hours
- CSS/Tailwind media queries
- **Tokens**: ~1000 (layout adjustments)
- **Premium requests**: 0
- **Dependencies**: Existing components
- **Implementation**: Breakpoints, flexbox adjustments

#### 3. DiffViewer Component (17 tests) - 6-8 hours  
- React component with `diff` library (already installed)
- **Tokens**: ~2000 (styling + logic)
- **Premium requests**: 0
- **Dependencies**: `policydiff.ts` library
- **Implementation**: Split/unified views, syntax highlighting

### TIER 2: Medium Effort (3-5 days, moderate tokens)

#### 4. Dashboard API (16 tests) - 1-2 days
- Aggregate queries, no complex logic
- **Tokens**: ~3000 (API routes + tests)
- **Premium requests**: 1-2 (query optimization)
- **Dependencies**: Prisma queries
- **Implementation**: Aggregation logic, customer scoping

#### 5. Authentication Flow (10 tests) - 1-2 days
- NextAuth already configured, needs testing
- **Tokens**: ~2500 (test implementations)
- **Premium requests**: 0-1
- **Dependencies**: NextAuth v5, Prisma
- **Implementation**: Test coverage for existing auth logic

#### 6. Policy Diff System (38 tests) - 2-3 days
- `diff` library integration, text processing
- **Tokens**: ~5000 (algorithms + tests)
- **Premium requests**: 2-3 (complex logic)
- **Dependencies**: `diff` package (installed)
- **Implementation**: Change detection, metrics calculation, significance scoring

### TIER 3: Heavy Lifting (1-2 weeks, high tokens)

#### 7. Cost Feedback Learning Loop (16 tests) - 3-4 days
- DB schema changes, variance calculations
- **Tokens**: ~4000 (learning algorithms)
- **Premium requests**: 3-5 (statistical modeling)
- **Dependencies**: Cost Estimate API, Prisma schema updates
- **Implementation**: Variance tracking, calibration adjustments

#### 8. AI Summarizer (33 tests) - 4-5 days
- OpenAI integration, caching, retry logic
- **Tokens**: ~6000 (AI prompts + error handling)
- **Premium requests**: 5-8 (prompt engineering)
- **Dependencies**: OpenAI SDK (installed), policy diff system
- **Implementation**: Prompt engineering, response parsing, caching strategy

#### 9. Cost Estimate API (48 tests) - 5-7 days
- Complex business logic, AI integration, DB transactions
- **Tokens**: ~8000 (full workflow)
- **Premium requests**: 8-12 (AI integration + optimization)
- **Dependencies**: AI cost estimator (partially implemented), Prisma
- **Implementation**: Full CRUD, AI extraction, department allocation, scenario analysis

---

## 🚀 SUGGESTED IMPLEMENTATION ORDER (Strategic Sequence)

### Phase 1: Foundation (Week 1)
**Enable basic platform functionality**

#### 1. Authentication Flow (10 tests) - Day 1  
- **Why first**: Everything requires auth; blocks all other features  
- **Effort**: 1 day  
- **Tokens**: 2,500  
- **Premium**: 0-1  
- **Deliverables**: Login flow, session management, protected routes

#### 2. Dashboard API (16 tests) - Days 2-3  
- **Why next**: Users need landing page; unblocks UI testing  
- **Effort**: 2 days  
- **Tokens**: 3,000  
- **Premium**: 1-2  
- **Deliverables**: Metrics aggregation, deadline queries, risk exposure calculation

#### 3. MetricCard Component (12 tests) - Day 3 (afternoon)  
- **Why now**: Makes dashboard visually complete, quick win  
- **Effort**: 4 hours  
- **Tokens**: 500  
- **Premium**: 0  
- **Deliverables**: Reusable metric display component with trend indicators

### Phase 2: Core Value (Week 2)
**Deliver primary differentiators**

#### 4. Policy Diff System (38 tests) - Days 4-6  
- **Why now**: Foundation for AI summarizer; core feature  
- **Effort**: 3 days  
- **Tokens**: 5,000  
- **Premium**: 2-3  
- **Deliverables**: Text diffing engine, change metrics, significance calculation

#### 5. DiffViewer Component (17 tests) - Day 7  
- **Why next**: UI for policy diff; enables user interaction  
- **Effort**: 1 day  
- **Tokens**: 2,000  
- **Premium**: 0  
- **Deliverables**: Split/unified diff views, interactive comparison UI

### Phase 3: AI & Intelligence (Week 3)
**Add AI-powered features**

#### 6. AI Summarizer (33 tests) - Days 8-12  
- **Why now**: Enhances policy diff with insights  
- **Effort**: 5 days  
- **Tokens**: 6,000  
- **Premium**: 5-8  
- **Deliverables**: Executive summaries, obligation extraction, significance scoring

#### 7. Cost Estimate API (48 tests) - Days 13-17  
- **Why finally**: Complex, depends on stable platform  
- **Effort**: 5 days  
- **Tokens**: 8,000  
- **Premium**: 8-12  
- **Deliverables**: Full cost estimation workflow, AI-powered analysis, department breakdowns

### Phase 4: Optimization (Week 4)
**Learning and polish**

#### 8. Cost Feedback Learning Loop (16 tests) - Days 18-21  
- **Why now**: Requires cost estimate data to train  
- **Effort**: 4 days  
- **Tokens**: 4,000  
- **Premium**: 3-5  
- **Deliverables**: Variance tracking, learning algorithms, confidence band narrowing

#### 9. Mobile Responsiveness (3 tests) - Day 22  
- **Why last**: Polish, not blocker; desktop works  
- **Effort**: 6 hours  
- **Tokens**: 1,000  
- **Premium**: 0  
- **Deliverables**: Responsive layouts for mobile/tablet devices

---

## 📊 SUMMARY METRICS

| Feature | Tests | Effort | Tokens | Premium | Value | Priority |
|---------|-------|--------|--------|---------|-------|----------|
| Auth Flow | 10 | 1d | 2.5K | 0-1 | Critical | P1 |
| Dashboard API | 16 | 2d | 3K | 1-2 | High | P1 |
| MetricCard | 12 | 0.5d | 0.5K | 0 | Low | P1 |
| Policy Diff | 38 | 3d | 5K | 2-3 | Critical | P2 |
| DiffViewer | 17 | 1d | 2K | 0 | Medium | P2 |
| AI Summarizer | 33 | 5d | 6K | 5-8 | High | P3 |
| Cost Estimate API | 48 | 5-7d | 8K | 8-12 | Critical | P3 |
| Cost Feedback | 16 | 4d | 4K | 3-5 | Medium | P4 |
| Mobile | 3 | 0.5d | 1K | 0 | Low | P4 |

### Totals
- **Tests to implement**: 193  
- **Estimated effort**: 22 days (1 developer)
- **Total tokens**: ~32,000  
- **Premium requests**: ~19-31  
- **Critical path**: Auth → Dashboard → Policy Diff → Cost Estimate API (enables MVP)

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### Dependencies Already Installed
✅ `diff` - Text diffing library  
✅ `openai` - OpenAI SDK  
✅ `next-auth` - Authentication (v5)  
✅ `@prisma/client` - Database ORM  
✅ `zod` - Schema validation  
✅ `recharts` - Chart library  
✅ `dayjs` - Date manipulation (recently migrated from date-fns)  
✅ `happy-dom` - Testing environment (recently migrated from jsdom)

### Key Implementation Files
- **Cost Estimator**: `src/lib/cost-estimator/` (partially implemented)
- **Policy Diff**: `src/lib/policydiff.ts` (skeleton exists)
- **AI Services**: `src/lib/ai/summarizer.ts` (skeleton exists)
- **Auth Config**: `src/auth.config.ts` (configured, needs tests)
- **API Routes**: `src/app/api/` (various endpoints exist)

### Database Schema
- **Prisma schema**: `prisma/schema.prisma` (comprehensive, includes all models)
- **Key models**: Customer, User, Regulation, RegulationVersion, PolicyDiff, CostEstimate, Deadline, Alert, Approval, Comment
- **Schema updates needed**: CostFeedback table for learning loop

---

## 💡 RECOMMENDATIONS

### Immediate Actions (Week 1)
1. **Implement Authentication Flow** - Unblocks all development
2. **Complete Dashboard API** - Provides data layer for UI
3. **Build MetricCard Component** - Quick win, improves UX

### Strategic Focus (Weeks 2-3)
4. **Policy Diff System** - Core differentiator
5. **AI Summarizer** - Enhances diff feature, high value

### Polish & Optimization (Week 4)
6. **Cost Feedback Loop** - Long-term accuracy improvement
7. **Mobile Responsiveness** - Market expansion

### Risk Mitigation
- **AI Token Costs**: Already optimized with caching and deterministic fallbacks
- **Database Performance**: Implement query optimization during Dashboard API work
- **Test Coverage**: Current passing tests: 203/250 (81% coverage for implemented features)

---

## 📈 SUCCESS METRICS

### MVP Readiness (End of Week 3)
- ✅ Authentication working
- ✅ Dashboard loading with real data
- ✅ Policy diff generating comparisons
- ✅ Cost estimates calculating with AI
- ✅ All critical path tests passing (10 + 16 + 38 + 48 = 112 tests)

### Production Readiness (End of Week 4)
- ✅ All 193 tests passing
- ✅ Mobile responsive
- ✅ Learning loop active
- ✅ 90%+ test coverage
- ✅ Performance benchmarks met

---

**Document Version**: 1.0  
**Last Updated**: February 16, 2026  
**Status**: Planning Phase
