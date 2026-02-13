-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isConsumable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remainingTurns" INTEGER;
