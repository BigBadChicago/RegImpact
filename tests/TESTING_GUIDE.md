# Testing Guide

## Overview
This project uses a three-layer testing strategy:
- Unit tests: Fast, isolated, no external dependencies
- Integration tests: API routes and database interactions
- End-to-end (E2E) tests: Critical user flows in a real browser

Test framework choices:
- Vitest for unit and integration tests
- Playwright for E2E tests
- MSW for API mocking (OpenAI, NextAuth, internal endpoints)

## Test Suite Structure

```
/tests
  /unit
    /app
    /auth
    /components
    /fixtures
    /lib
  /integration
    /api
    /auth
  /e2e
  /fixtures
  /mocks
  /utils
```

## When to Write Each Type of Test

- Unit tests: For utilities, small business logic, and React components
- Integration tests: For API routes and database interactions
- E2E tests: For login flows, dashboard workflows, and regulation diff comparisons

## Running Tests Locally

### Unit Tests
```
npm run test:unit
```

### Integration Tests
Integration tests require a test database (PostgreSQL).
```
# Start Docker test database
# (see .env.test for connection string)

npm run test:integration
```

### E2E Tests
```
npm run test:e2e
```

### Run All Tests
```
npm run test:all
```

### Watch Mode (Development)
```
npm run test:watch
```

## Adding Tests for New Features

### Unit Test Pattern (AAA)
- Arrange: Set up data and mocks
- Act: Execute the function or action
- Assert: Verify expected results

### Integration Test Pattern
- Mock authentication
- Seed test data
- Call API route handler
- Assert response and side effects

### E2E Test Pattern
- Log in first
- Navigate to feature
- Trigger user interaction
- Verify UI updates

## Mocking Strategies

- API calls: Use MSW in tests/mocks/handlers.ts
- Database: Use Prisma test database or mocked Prisma client
- Auth: Mock getServerSession or signIn as needed

## Debugging Failing Tests

### Unit Tests
```
# Run a single test file
npx vitest tests/unit/lib/policydiff.test.ts

# UI test runner
npm run test:ui
```

### Integration Tests
```
# Enable Prisma query logging
DEBUG="prisma:query" npx vitest tests/integration/api/dashboard.test.ts
```

### E2E Tests
```
# Run in headed mode
npx playwright test --headed

# Debug mode
npx playwright test --debug

# View report
npx playwright show-report
```

## CI/CD Pipeline

GitHub Actions runs tests on every push and pull request:
- Unit tests (fast, parallel)
- Integration tests (with PostgreSQL service)
- E2E tests (Playwright)

## Coverage Expectations

Targets:
- lib/: 95%+
- components/: 80%+
- API routes: 90%+
- app/: 50%+
- Overall: 80%+

## Common Pitfalls

- Missing environment variables in .env.test
- OpenAI API key not mocked
- Prisma database not running
- App Router components not testable without mock providers

## Example: Good Unit Test

```
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/myFunction'

describe('myFunction', () => {
  it('should return expected output', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = myFunction(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```
