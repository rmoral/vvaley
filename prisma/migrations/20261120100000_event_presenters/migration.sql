-- CreateTable
CREATE TABLE "EventPresenter" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPresenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPresenterTranslation" (
    "id" TEXT NOT NULL,
    "presenterId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "EventPresenterTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPresenter_eventId_position_idx" ON "EventPresenter"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "EventPresenterTranslation_presenterId_locale_key" ON "EventPresenterTranslation"("presenterId", "locale");

-- AddForeignKey
ALTER TABLE "EventPresenter" ADD CONSTRAINT "EventPresenter_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPresenterTranslation" ADD CONSTRAINT "EventPresenterTranslation_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "EventPresenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

