/*
  Warnings:

  - You are about to drop the column `backgroundColor` on the `TacticalMap` table. All the data in the column will be lost.
  - You are about to drop the column `cellUnit` on the `TacticalMap` table. All the data in the column will be lost.
  - You are about to drop the column `drawings` on the `TacticalMap` table. All the data in the column will be lost.
  - You are about to drop the column `gridColor` on the `TacticalMap` table. All the data in the column will be lost.
  - You are about to drop the column `gridHeight` on the `TacticalMap` table. All the data in the column will be lost.
  - You are about to drop the column `gridSize` on the `TacticalMap` table. All the data in the column will be lost.
  - You are about to drop the column `gridWidth` on the `TacticalMap` table. All the data in the column will be lost.
  - You are about to drop the column `tokens` on the `TacticalMap` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TacticalMap" DROP COLUMN "backgroundColor",
DROP COLUMN "cellUnit",
DROP COLUMN "drawings",
DROP COLUMN "gridColor",
DROP COLUMN "gridHeight",
DROP COLUMN "gridSize",
DROP COLUMN "gridWidth",
DROP COLUMN "tokens",
ADD COLUMN     "activeSceneId" TEXT;

-- CreateTable
CREATE TABLE "MapScene" (
    "id" TEXT NOT NULL,
    "tacticalMapId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Nouvelle Scène',
    "order" INTEGER NOT NULL DEFAULT 0,
    "gridSize" INTEGER NOT NULL DEFAULT 50,
    "gridWidth" INTEGER NOT NULL DEFAULT 30,
    "gridHeight" INTEGER NOT NULL DEFAULT 20,
    "gridColor" TEXT NOT NULL DEFAULT '#444444',
    "gridOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "backgroundColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "backgroundImage" TEXT,
    "backgroundOpacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "cellUnit" TEXT NOT NULL DEFAULT '5ft',
    "tokens" JSONB NOT NULL DEFAULT '[]',
    "drawings" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapScene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapScene_tacticalMapId_idx" ON "MapScene"("tacticalMapId");

-- AddForeignKey
ALTER TABLE "MapScene" ADD CONSTRAINT "MapScene_tacticalMapId_fkey" FOREIGN KEY ("tacticalMapId") REFERENCES "TacticalMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
