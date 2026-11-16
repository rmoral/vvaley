-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterEnum
ALTER TYPE "RegistrationStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "onlinePayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "amountCents" INTEGER,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "kunfupaySessionId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidCents" INTEGER,
ADD COLUMN     "paymentAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus";

-- CreateTable
CREATE TABLE "KunfupayWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "KunfupayWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KunfupayWebhookEvent_eventId_key" ON "KunfupayWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "KunfupayWebhookEvent_eventType_idx" ON "KunfupayWebhookEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_kunfupaySessionId_key" ON "EventRegistration"("kunfupaySessionId");

