-- CreateTable
CREATE TABLE "TacticalMap" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gridSize" INTEGER NOT NULL DEFAULT 50,
    "gridWidth" INTEGER NOT NULL DEFAULT 20,
    "gridHeight" INTEGER NOT NULL DEFAULT 15,
    "gridColor" TEXT NOT NULL DEFAULT '#444444',
    "backgroundColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "cellUnit" TEXT NOT NULL DEFAULT '5ft',
    "tokens" JSONB NOT NULL DEFAULT '[]',
    "drawings" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TacticalMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TacticalMap_gameId_key" ON "TacticalMap"("gameId");

-- CreateIndex
CREATE INDEX "TacticalMap_gameId_idx" ON "TacticalMap"("gameId");

-- AddForeignKey
ALTER TABLE "TacticalMap" ADD CONSTRAINT "TacticalMap_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
