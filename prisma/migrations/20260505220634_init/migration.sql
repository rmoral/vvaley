-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EpisodePillar" AS ENUM ('ECONOMY', 'COMPANY', 'ENTREPRENEURSHIP', 'TECH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "headline" TEXT,
    "company" TEXT,
    "role" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "email" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "instagram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "number" INTEGER,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "summary" TEXT,
    "showNotes" TEXT,
    "pillar" "EpisodePillar",
    "durationSec" INTEGER,
    "audioUrl" TEXT,
    "coverImageUrl" TEXT,
    "spotifyUrl" TEXT,
    "appleUrl" TEXT,
    "youtubeUrl" TEXT,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeGuest" (
    "episodeId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EpisodeGuest_pkey" PRIMARY KEY ("episodeId","guestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_slug_key" ON "Guest"("slug");

-- CreateIndex
CREATE INDEX "Guest_fullName_idx" ON "Guest"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_slug_key" ON "Episode"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_number_key" ON "Episode"("number");

-- CreateIndex
CREATE INDEX "Episode_status_publishedAt_idx" ON "Episode"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "EpisodeGuest_guestId_idx" ON "EpisodeGuest"("guestId");

-- AddForeignKey
ALTER TABLE "EpisodeGuest" ADD CONSTRAINT "EpisodeGuest_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeGuest" ADD CONSTRAINT "EpisodeGuest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
