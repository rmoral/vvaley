-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'RECORDED', 'DECLINED');

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "inviteSentAt" TIMESTAMP(3),
ADD COLUMN     "recordingAt" TIMESTAMP(3),
ADD COLUMN     "recordingUrl" TEXT;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "status" "GuestStatus" NOT NULL DEFAULT 'PROPOSED';

-- CreateIndex
CREATE INDEX "Episode_recordingAt_idx" ON "Episode"("recordingAt");

-- CreateIndex
CREATE INDEX "Guest_status_scheduledAt_idx" ON "Guest"("status", "scheduledAt");
