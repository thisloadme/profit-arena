-- Set the loans.status default to PENDING now that the enum value is committed.
-- Split from 20260706050528_add_pending_loan_status because Postgres rejects
-- using a newly-added enum value within the same transaction that added it.
ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'PENDING';
