-- AlterTable
ALTER TABLE "NewsTranslation" ADD COLUMN     "coverImageAlt" TEXT,
ADD COLUMN     "faq" JSONB,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "PostTranslation" ADD COLUMN     "coverImageAlt" TEXT,
ADD COLUMN     "faq" JSONB,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;
