-- CreateTable
CREATE TABLE "Relation" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'neutre',
    "label" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Relation_gameId_idx" ON "Relation"("gameId");

-- CreateIndex
CREATE INDEX "Relation_sourceId_idx" ON "Relation"("sourceId");

-- CreateIndex
CREATE INDEX "Relation_targetId_idx" ON "Relation"("targetId");

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
