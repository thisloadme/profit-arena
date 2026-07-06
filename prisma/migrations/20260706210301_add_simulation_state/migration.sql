-- CreateTable
CREATE TABLE "simulation_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tickNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_state_pkey" PRIMARY KEY ("id")
);
