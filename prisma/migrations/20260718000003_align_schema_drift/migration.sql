-- =====================================================================
-- Align DB objects to match schema.prisma's expectations (eliminate drift).
--
-- Why this exists: Prisma's `@@index` can't represent DESC ordering or
-- partial indexes (WHERE clauses), so the perf indexes that 20260717000002
-- created with `createdAt DESC` show up as "drift" in `prisma migrate diff`
-- forever — even though they were intentionally raw-SQL perf indexes.
--
-- Resolution: drop them entirely. With Prisma unable to model them, we'd
-- re-introduce drift every time we touch the schema. Postgres can serve
-- `ORDER BY ... DESC` via backward index scan on ASC indexes, but for the
-- current data volume (small) a sequence scan is fine and drift-free.
--
-- The FK change (employments.jobId → ON UPDATE CASCADE) IS something
-- Prisma tracks, so we keep that fix here too.
-- =====================================================================

-- 1. Re-create FK with Prisma's default ON UPDATE CASCADE.
ALTER TABLE "employments" DROP CONSTRAINT "employments_jobId_fkey";
ALTER TABLE "employments"
  ADD CONSTRAINT "employments_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Drop perf indexes that Prisma can't model in `@@index`.
--    Re-add with raw SQL (with DESC) later if /api/notifications or
--    /api/transactions ever show up in slow-query logs.
DROP INDEX IF EXISTS "notifications_userId_isRead_createdAt_idx";
DROP INDEX IF EXISTS "transactions_userId_createdAt_idx";