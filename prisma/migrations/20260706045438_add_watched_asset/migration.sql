-- CreateTable
CREATE TABLE "watched_assets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "watched_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watched_assets_userId_symbol_key" ON "watched_assets"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "watched_assets" ADD CONSTRAINT "watched_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
