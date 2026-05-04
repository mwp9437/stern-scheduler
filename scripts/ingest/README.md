# scripts/ingest

One Python script per semester. Reads the Stern admin xlsx and upserts
`public.courses`, collapsing multi-pattern source rows into one DB row per
Class Nbr (with the full pattern list preserved in the `meeting_patterns`
JSONB column).

## Setup (one-time)

```bash
cd scripts/ingest
python -m pip install -r requirements.txt
```

Then create `scripts/ingest/.env` with:

```
SUPABASE_URL=https://rzlsqivbgojatxxvrywl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase Dashboard -> Settings -> API -> service_role>
```

`.env` is gitignored. The service role key bypasses RLS — treat it like a password.

If you don't want to set up the service role key, use `--sql-out` mode to
generate the SQL and apply via the Supabase MCP `apply_migration` tool.

## Run

```bash
# Dry run — parse + summarize, no writes:
python fall_2026.py --dry-run

# Direct upsert (idempotent, safe to re-run):
python fall_2026.py

# Emit SQL instead of writing — useful for review or applying via the
# Supabase MCP `apply_migration` tool when env vars aren't set up:
python fall_2026.py --sql-out fall_2026_data.sql

# Override the xlsx path:
python fall_2026.py --xlsx /path/to/file.xlsx
```

The default xlsx path is `~/Downloads/Fall 2026 MBA course schedule.xlsx`.

## Verification queries

After a run, check counts:

```sql
SELECT COUNT(*) FROM public.courses;                              -- expect 258
SELECT duration_type, COUNT(*) FROM public.courses
  GROUP BY duration_type ORDER BY duration_type;                  -- 5 buckets
SELECT COUNT(*) FROM public.courses
  WHERE jsonb_array_length(meeting_patterns) > 1;                 -- expect 72

-- Spot-check a multi-pattern intensive:
SELECT class_nbr, course_title, duration_type, meeting_days,
       start_time, end_time, dates_full, meeting_patterns
FROM public.courses WHERE class_nbr = '3155';
```

## Syllabus links (`syllabus_links.py`)

Populates `courses.syllabus_url` from a snapshot of the Stern syllabilist
page (`https://web-apps-shib.stern.nyu.edu/syllabi/syllabilist/g/<term>`).
The page is Shibboleth-protected and can't be fetched server-side, so the
ingest reads a saved HTML file.

```bash
# 1. In your browser (logged into NYU), visit the syllabilist URL.
# 2. File -> Save Page As -> scripts/ingest/data/fa26_syllabi.html
#    (the data/ dir is gitignored)

# Dry run — parse + summarize, no writes:
python syllabus_links.py --dry-run

# Direct PATCH (idempotent, safe to re-run):
python syllabus_links.py

# Emit SQL instead of writing:
python syllabus_links.py --sql-out _fa26_syllabus_links.sql
```

Match key is `(subject, catalog, section)`. Rows on the syllabilist page
that don't match a course in the DB (dropped sections, etc.) are reported
but not fatal.

## For Spring 2027

1. Copy this directory to `scripts/ingest/spring_2027.py`.
2. Update the default xlsx path and the script docstring.
3. Inspect any **new Session codes** in the source file:
   ```python
   # Run with --dry-run first; the script will fail loudly on unknown Session.
   ```
4. Add new codes to `SESSION_TO_DURATION` in the script if needed.
5. Verify `RANGE_PAT_EXPANSION` covers any new range patterns (`M-S`, `M-U`, etc.).
6. Run with `--dry-run`, then `--sql-out` to review, then for real.

## Why one row per Class Nbr (and JSONB for the rest)

NYU's source file emits one row per meeting pattern, so a hybrid intensive
like ACCT-GB 3103 (CN 3155) appears as 3 source rows: one in-person day
plus two async work blocks. The frontend treats each `courses.id` as one
selectable course (one credit total, one entry in Course Finder). To keep
that UX honest while preserving the full schedule, we store one row per
Class Nbr, populate the **flat columns** from the "primary" in-person
pattern (used by search and conflict detection's fallback path), and keep
the **full pattern list** in `meeting_patterns` (JSONB array). The
calendar event builder iterates `meeting_patterns` so every block renders;
conflict detection (`coursesConflict`, `courseConflictsWithEvent`,
`courseMeetsAtTime` in `src/types/scheduler.ts`) iterates patterns too so
non-primary blocks are caught.
