-- CreateTable
CREATE TABLE "DiceRoll" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "diceType" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "modifier" INTEGER NOT NULL,
    "results" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "reason" TEXT,
    "advantage" BOOLEAN NOT NULL DEFAULT false,
    "disadvantage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiceRoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiceRoll_gameId_idx" ON "DiceRoll"("gameId");

-- CreateIndex
CREATE INDEX "DiceRoll_userId_idx" ON "DiceRoll"("userId");

-- CreateIndex
CREATE INDEX "DiceRoll_gameId_userId_idx" ON "DiceRoll"("gameId", "userId");

-- AddForeignKey
ALTER TABLE "DiceRoll" ADD CONSTRAINT "DiceRoll_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiceRoll" ADD CONSTRAINT "DiceRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
