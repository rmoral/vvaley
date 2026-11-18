-- CreateTable
CREATE TABLE "EventEmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEmailSend" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "reason" TEXT,
    "statuses" "RegistrationStatus"[],
    "recipients" INTEGER NOT NULL,
    "sent" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventEmailSend_eventId_createdAt_idx" ON "EventEmailSend"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventEmailSend" ADD CONSTRAINT "EventEmailSend_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEmailSend" ADD CONSTRAINT "EventEmailSend_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventEmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEmailSend" ADD CONSTRAINT "EventEmailSend_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
