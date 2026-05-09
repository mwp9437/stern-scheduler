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

## Course descriptions (`course_descriptions.py`)

Populates `courses.description` from a markdown export of Stern's catalog
descriptions. The source markdown has one entry per course in the form:

```
COR1-GB.1102 Leadership (1.5)
Course Description: <prose, possibly multi-line>
[Pre-requisites:
<optional prose>]
Back to Top<Department Name>
```

Match key is `(subject, catalog)` — every section of a course gets the same
description. The frontend renders descriptions in a hover card on
calendar blocks and Course Finder rows.

```bash
# Save the catalog markdown to scripts/ingest/data/course_descriptions.md
# (the data/ dir is gitignored).

# Dry run — parse + summarize, no writes:
python course_descriptions.py --dry-run

# Direct PATCH (idempotent, safe to re-run):
python course_descriptions.py

# Emit SQL instead of writing:
python course_descriptions.py --sql-out _course_descriptions.sql

# Override the source path:
python course_descriptions.py --md /path/to/file.md
```

## For Spring 2027

1. **Catalog ingest**: copy `fall_2026.py` to `scripts/ingest/spring_2027.py`. Update the default xlsx path and the script docstring.
2. Inspect any **new Session codes** in the source file:
   ```python
   # Run with --dry-run first; the script will fail loudly on unknown Session.
   ```
3. Add new codes to `SESSION_TO_DURATION` in the script if needed.
4. Verify `RANGE_PAT_EXPANSION` covers any new range patterns (`M-S`, `M-U`, etc.).
5. Run with `--dry-run`, then `--sql-out` to review, then for real.
6. **Syllabus links**: save the new term's syllabilist HTML to `scripts/ingest/data/sp27_syllabi.html` and run `python syllabus_links.py`.
7. **Course descriptions**: save the new term's catalog markdown to `scripts/ingest/data/course_descriptions.md` and run `python course_descriptions.py`. (Most descriptions are stable across terms — only diff against the previous file if you want to skip unchanged courses.)

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
