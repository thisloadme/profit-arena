-- Add tokenVersion to users for session revocation (logout/login bumps it;
-- JWT embeds the version and is rejected on mismatch).
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
