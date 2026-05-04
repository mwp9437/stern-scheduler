-- Add a per-course syllabus URL.
--
-- Populated by scripts/ingest/syllabus_links.py from a snapshot of the
-- Stern syllabilist page. Nullable: not every course has a posted syllabus,
-- and prior terms' rows have nothing to point at.

ALTER TABLE public.courses
  ADD COLUMN syllabus_url text;
