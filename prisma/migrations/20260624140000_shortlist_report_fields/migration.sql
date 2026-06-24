-- AlterTable
ALTER TABLE "shortlist_candidates" ADD COLUMN     "academic_results" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "certifications" TEXT,
ADD COLUMN     "current_role" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "source" TEXT DEFAULT 'external',
ADD COLUMN     "years_experience" INTEGER;

-- AlterTable
ALTER TABLE "shortlist_runs" ADD COLUMN     "candidate_type" TEXT DEFAULT 'experienced';

