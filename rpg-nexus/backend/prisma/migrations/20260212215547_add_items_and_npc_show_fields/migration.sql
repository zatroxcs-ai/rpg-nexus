-- AlterTable
ALTER TABLE "Npc" ADD COLUMN     "actions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "showAc" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showActions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showHp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showSpeed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showStats" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "speed" INTEGER;

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "rarity" TEXT NOT NULL DEFAULT 'commun',
    "category" TEXT NOT NULL DEFAULT 'divers',
    "weight" DOUBLE PRECISION,
    "value" INTEGER,
    "effects" JSONB NOT NULL DEFAULT '[]',
    "assignedToType" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_gameId_idx" ON "Item"("gameId");

-- CreateIndex
CREATE INDEX "Item_assignedToId_idx" ON "Item"("assignedToId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
