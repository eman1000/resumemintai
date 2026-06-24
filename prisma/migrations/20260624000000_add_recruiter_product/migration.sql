-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "user_type" TEXT NOT NULL DEFAULT 'candidate';

-- CreateTable
CREATE TABLE "job_postings" (
    "id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "employment_type" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "currency" TEXT DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL,
    "job_posting_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "resume_id" UUID,
    "cover_letter_id" UUID,
    "resume_text" TEXT,
    "applicant_name" TEXT,
    "applicant_email" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_runs" (
    "id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "job_posting_id" UUID,
    "label" TEXT,
    "jd_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_candidates" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "application_id" UUID,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "verdict" TEXT,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_postings_slug_key" ON "job_postings"("slug");

-- CreateIndex
CREATE INDEX "job_postings_status_created_at_idx" ON "job_postings"("status", "created_at");

-- CreateIndex
CREATE INDEX "job_postings_recruiter_id_created_at_idx" ON "job_postings"("recruiter_id", "created_at");

-- CreateIndex
CREATE INDEX "job_applications_job_posting_id_status_idx" ON "job_applications"("job_posting_id", "status");

-- CreateIndex
CREATE INDEX "job_applications_applicant_id_created_at_idx" ON "job_applications"("applicant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_job_posting_id_applicant_id_key" ON "job_applications"("job_posting_id", "applicant_id");

-- CreateIndex
CREATE INDEX "shortlist_runs_recruiter_id_created_at_idx" ON "shortlist_runs"("recruiter_id", "created_at");

-- CreateIndex
CREATE INDEX "shortlist_candidates_run_id_score_idx" ON "shortlist_candidates"("run_id", "score");

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_runs" ADD CONSTRAINT "shortlist_runs_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_runs" ADD CONSTRAINT "shortlist_runs_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_candidates" ADD CONSTRAINT "shortlist_candidates_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "shortlist_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_candidates" ADD CONSTRAINT "shortlist_candidates_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

