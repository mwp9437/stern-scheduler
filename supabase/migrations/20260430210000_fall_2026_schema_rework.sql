-- Fall 2026 catalog ingest: schema rework
--
-- Adds columns mirroring the official Stern admin export format (Subject + Catalog
-- + Title + Session code + Mode + Term code) so future-semester ingests are a
-- near-zero-effort re-run. Drops Spring 2026 data (web-scraped, won't be reused).
-- Adds a JSONB `meeting_patterns` column to preserve full multi-pattern fidelity
-- for INS/INW/XTL classes that have multiple meeting blocks per Class Nbr.
--
-- The flat columns (meeting_days, start_time, end_time, dates_full,
-- meeting_times_full) remain populated from the "primary" pattern (first
-- in-person, lowest pat_nbr) for backward compatibility and search.

ALTER TABLE public.courses
  ADD COLUMN catalog          text,
  ADD COLUMN course_title     text,
  ADD COLUMN session_code     text,
  ADD COLUMN mode             text,
  ADD COLUMN term_code        text,
  ADD COLUMN meeting_patterns jsonb;

-- Wipe Spring 2026. The 31 user_schedules rows referencing Spring course_ids
-- are also wiped (Spring courses become irrelevant for Fall, users will re-pick).
-- The 12 custom events (internship/recruiting/personal time blocks) are untouched
-- because they have course_id IS NULL.
DELETE FROM public.user_schedules WHERE course_id IS NOT NULL;
DELETE FROM public.courses;

-- One row per Class Nbr (collapse multi-pattern source rows on ingest).
ALTER TABLE public.courses
  ADD CONSTRAINT courses_class_nbr_unique UNIQUE (class_nbr);

-- Shape guard for meeting_patterns.
ALTER TABLE public.courses
  ADD CONSTRAINT meeting_patterns_is_array
  CHECK (meeting_patterns IS NULL OR jsonb_typeof(meeting_patterns) = 'array');

-- GIN index for any future jsonb_path queries against patterns.
CREATE INDEX courses_meeting_patterns_gin
  ON public.courses USING gin (meeting_patterns jsonb_path_ops);
