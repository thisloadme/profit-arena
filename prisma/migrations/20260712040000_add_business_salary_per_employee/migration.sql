-- AlterTable: player-tunable wage per business. 0 = fall back to type default.
ALTER TABLE "businesses" ADD COLUMN "salaryPerEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0;
