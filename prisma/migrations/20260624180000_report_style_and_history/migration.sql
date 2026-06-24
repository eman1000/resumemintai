-- AlterTable
ALTER TABLE "shortlist_candidates" ADD COLUMN     "experience_history" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "recruiter_report_style" TEXT;

