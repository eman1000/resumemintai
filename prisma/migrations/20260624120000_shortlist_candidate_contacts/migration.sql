-- AlterTable
ALTER TABLE "shortlist_candidates" ADD COLUMN     "email" TEXT,
ADD COLUMN     "links" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "resume_name" TEXT,
ADD COLUMN     "resume_url" TEXT;

