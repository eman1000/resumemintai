-- AlterTable
ALTER TABLE "cover_letters" ADD COLUMN     "tailored_for_job" JSONB;

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "tailored_for_job" JSONB;
