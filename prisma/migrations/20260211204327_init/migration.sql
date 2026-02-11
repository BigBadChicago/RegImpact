-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'GROWTH', 'SCALE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "JurisdictionType" AS ENUM ('FEDERAL', 'STATE', 'LOCAL');

-- CreateEnum
CREATE TYPE "RegulationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PolicyDiffSignificance" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "DeadlineRiskLevel" AS ENUM ('CRITICAL', 'IMPORTANT', 'ROUTINE');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "industry" TEXT NOT NULL,
    "subscriptionTier" "SubscriptionTier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JurisdictionType" NOT NULL,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulations" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "regulationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "status" "RegulationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation_versions" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentText" TEXT NOT NULL,
    "contentJson" JSONB,
    "publishedDate" TIMESTAMP(3) NOT NULL,
    "ingestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_diffs" (
    "id" TEXT NOT NULL,
    "regulationVersionId" TEXT NOT NULL,
    "previousVersionId" TEXT,
    "diffText" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyChanges" TEXT[],
    "significanceScore" "PolicyDiffSignificance" NOT NULL,
    "aiConfidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_diffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlines" (
    "id" TEXT NOT NULL,
    "regulationVersionId" TEXT NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "deadlineType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" "DeadlineRiskLevel" NOT NULL,
    "extractionConfidence" DOUBLE PRECISION NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_estimates" (
    "id" TEXT NOT NULL,
    "regulationVersionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "oneTimeCostLow" DOUBLE PRECISION NOT NULL,
    "oneTimeCostHigh" DOUBLE PRECISION NOT NULL,
    "recurringCostAnnual" DOUBLE PRECISION NOT NULL,
    "costDriversJson" JSONB NOT NULL,
    "departmentBreakdown" JSONB,
    "estimationMethod" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_customerId_idx" ON "users"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_code_key" ON "jurisdictions"("code");

-- CreateIndex
CREATE INDEX "regulations_jurisdictionId_idx" ON "regulations"("jurisdictionId");

-- CreateIndex
CREATE INDEX "regulation_versions_regulationId_idx" ON "regulation_versions"("regulationId");

-- CreateIndex
CREATE UNIQUE INDEX "policy_diffs_regulationVersionId_key" ON "policy_diffs"("regulationVersionId");

-- CreateIndex
CREATE INDEX "policy_diffs_regulationVersionId_idx" ON "policy_diffs"("regulationVersionId");

-- CreateIndex
CREATE INDEX "policy_diffs_previousVersionId_idx" ON "policy_diffs"("previousVersionId");

-- CreateIndex
CREATE INDEX "deadlines_regulationVersionId_idx" ON "deadlines"("regulationVersionId");

-- CreateIndex
CREATE INDEX "cost_estimates_regulationVersionId_idx" ON "cost_estimates"("regulationVersionId");

-- CreateIndex
CREATE INDEX "cost_estimates_customerId_idx" ON "cost_estimates"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_diffs" ADD CONSTRAINT "policy_diffs_regulationVersionId_fkey" FOREIGN KEY ("regulationVersionId") REFERENCES "regulation_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_diffs" ADD CONSTRAINT "policy_diffs_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "regulation_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_regulationVersionId_fkey" FOREIGN KEY ("regulationVersionId") REFERENCES "regulation_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_estimates" ADD CONSTRAINT "cost_estimates_regulationVersionId_fkey" FOREIGN KEY ("regulationVersionId") REFERENCES "regulation_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_estimates" ADD CONSTRAINT "cost_estimates_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
