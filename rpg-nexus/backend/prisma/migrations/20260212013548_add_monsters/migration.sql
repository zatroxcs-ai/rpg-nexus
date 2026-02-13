-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "description" TEXT,
    "showHp" BOOLEAN NOT NULL DEFAULT false,
    "showAc" BOOLEAN NOT NULL DEFAULT false,
    "showStats" BOOLEAN NOT NULL DEFAULT false,
    "showSpeed" BOOLEAN NOT NULL DEFAULT false,
    "showActions" BOOLEAN NOT NULL DEFAULT false,
    "hp" INTEGER,
    "maxHp" INTEGER,
    "ac" INTEGER,
    "strength" INTEGER,
    "dexterity" INTEGER,
    "constitution" INTEGER,
    "intelligence" INTEGER,
    "wisdom" INTEGER,
    "charisma" INTEGER,
    "speed" INTEGER,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "challengeRating" TEXT,
    "type" TEXT,
    "size" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Monster_gameId_idx" ON "Monster"("gameId");

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
