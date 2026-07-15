-- CreateEnum
CREATE TYPE "PayPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'NOTICE', 'TERMINATED');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "salaryPerPay" DOUBLE PRECISION NOT NULL,
    "payPeriod" "PayPeriod" NOT NULL,
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workEndHour" INTEGER NOT NULL DEFAULT 17,
    "description" TEXT NOT NULL,
    "badgeColor" TEXT NOT NULL DEFAULT 'primary',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_code_key" ON "jobs"("code");

-- AlterTable
-- Drop legacy per-tick salary columns (dormant — never populated).
ALTER TABLE "employments" DROP COLUMN "salaryPerTick";
ALTER TABLE "employments" DROP COLUMN "isActive";

-- Add new columns
ALTER TABLE "employments" ADD COLUMN "jobId" UUID;
ALTER TABLE "employments" ADD COLUMN "salaryPerPay" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "employments" ADD COLUMN "payPeriod" "PayPeriod" NOT NULL DEFAULT 'WEEKLY';
ALTER TABLE "employments" ADD COLUMN "workStartHour" INTEGER NOT NULL DEFAULT 9;
ALTER TABLE "employments" ADD COLUMN "workEndHour" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "employments" ADD COLUMN "nextPayAtTick" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "employments" ADD COLUMN "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "employments" ADD COLUMN "noticeUntilTick" INTEGER;
ALTER TABLE "employments" ADD COLUMN "endDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "employments_status_nextPayAtTick_idx" ON "employments"("status", "nextPayAtTick");

-- CreateIndex
CREATE INDEX "employments_userId_status_idx" ON "employments"("userId", "status");
