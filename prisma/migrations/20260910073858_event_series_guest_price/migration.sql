-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "guestId" TEXT,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "series" TEXT,
ADD COLUMN     "ticketUrl" TEXT;

-- CreateIndex
CREATE INDEX "Event_series_status_startsAt_idx" ON "Event"("series", "status", "startsAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
