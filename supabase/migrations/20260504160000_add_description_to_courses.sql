-- Add a per-course catalog description.
--
-- Populated by scripts/ingest/course_descriptions.py from the Stern course
-- catalog markdown (one description per (subject, catalog), shared across
-- sections). Nullable: not every course in the DB will have an entry in the
-- catalog source.

ALTER TABLE public.courses
  ADD COLUMN description text;
