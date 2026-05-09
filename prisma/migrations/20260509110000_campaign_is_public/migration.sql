-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Campaign_isPublic_sentAt_idx" ON "Campaign"("isPublic", "sentAt");
