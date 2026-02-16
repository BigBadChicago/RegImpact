-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dashboardLayout" JSONB;

-- CreateTable
CREATE TABLE "health_score_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_score_history_customerId_recordedAt_idx" ON "health_score_history"("customerId", "recordedAt");

-- AddForeignKey
ALTER TABLE "health_score_history" ADD CONSTRAINT "health_score_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
