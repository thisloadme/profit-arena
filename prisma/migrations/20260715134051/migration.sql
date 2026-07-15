-- AlterEnum
ALTER TYPE "FinancialStatus" ADD VALUE 'WEALTHY';

-- AlterTable
ALTER TABLE "limit_orders" ALTER COLUMN "limitPrice" DROP NOT NULL;
