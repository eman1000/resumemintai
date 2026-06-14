-- Add the master-resume flag (source of truth; at most one per user).
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "is_master" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark each user's earliest organic (non-tailored) resume as master.
UPDATE "resumes" r
SET "is_master" = true
FROM (
  SELECT DISTINCT ON (user_id) id
  FROM "resumes"
  WHERE tailored_for_job IS NULL AND archived = false
  ORDER BY user_id, created_at ASC
) earliest
WHERE r.id = earliest.id;
