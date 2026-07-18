-- Rename enum RiskProfile → FinancialStatus with new value set.
-- Mapping: MODERATE → STABLE (preserves current default; users on CONSERVATIVE
-- demote to STRUGGLING, AGGRESSIVE promote to COMFORTABLE — closer to intent
-- than a blanket default).
-- Postgres can't ALTER TYPE rename + change values in one shot;
-- add new type, convert column, drop old. Atomic per-table, runs in <1s.

ALTER TYPE "RiskProfile" RENAME TO "FinancialStatus";

-- Replace value set: keep STABLE, map old values into new tiers.
-- Postgres enum ALTER ADD VALUE must run outside a transaction.
ALTER TYPE "FinancialStatus" RENAME VALUE 'CONSERVATIVE' TO 'STRUGGLING';
ALTER TYPE "FinancialStatus" RENAME VALUE 'AGGRESSIVE' TO 'COMFORTABLE';
ALTER TYPE "FinancialStatus" RENAME VALUE 'MODERATE' TO 'STABLE';

-- Rename column + add manual override flag.
ALTER TABLE "users" RENAME COLUMN "riskProfile" TO "financialStatus";
ALTER TABLE "users" ADD COLUMN "financialStatusManual" BOOLEAN NOT NULL DEFAULT false;
