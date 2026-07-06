-- AlterEnum
ALTER TYPE "LoanStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_borrowerId_fkey";

-- AlterTable
ALTER TABLE "loans" ALTER COLUMN "borrowerId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
