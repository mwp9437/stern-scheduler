# Build History — Stern Scheduler

Full append-only archive of all session summaries. NOT used day-to-day. See `current-state.md` for active state and `change-log.md` for recent activity.

---

## [2026-04-30] — Session: Fall 2026 catalog ingest + courses schema rework

**What was done:**
- Reworked `public.courses` schema for the Stern admin xlsx format (separate Subject/Catalog/Title columns, Session codes, multi-pattern source rows).
- Wrote Python ingest script at `scripts/ingest/fall_2026.py` (idempotent upsert via PostgREST + service role; uses stdlib urllib because supabase-py won't build on Python 3.14).
- Loaded 258 Fall 2026 courses (124 Full Semester / 35 First Half / 27 Second Half / 65 Intensive / 7 DBi); 72 are multi-pattern, with all patterns preserved in `meeting_patterns` JSONB.
- Frontend rework across 7 files: 5 explicit duration types, `MeetingPattern` interface, `isOffCalendar`/`isCalendarVisible` helpers, conflict detection iterates patterns, `AlternateSchedulesTable` → `OffCalendarCoursesTable` (with Type column).
- Project permission rules at `stern-scheduler/.claude/settings.json` (auto-allow routine ops; require confirmation for push, destructive git, npm install <pkg>, .env edits, workflow edits).
- Post-smoke-test fixes: render only the longest pattern on the calendar, DBi badge from purple-100 to violet-200/800, `courseMeetsAtTime` excludes off-calendar courses, off-calendar table strips day-letter prefix from Meeting Times.
- Shipped commit `26dea54` and pushed to origin/main → Lovable auto-deploys to stern-scheduler.lovable.app.

**Files created:**
- `stern-scheduler/supabase/migrations/20260430210000_fall_2026_schema_rework.sql` — schema additions + Spring data wipe + UNIQUE on class_nbr + GIN index.
- `stern-scheduler/scripts/ingest/fall_2026.py` — Fall 2026 ingest. Re-runnable; basis for Spring 2027.
- `stern-scheduler/scripts/ingest/README.md` — setup + verification queries + Spring 2027 re-run notes.
- `stern-scheduler/scripts/ingest/requirements.txt` — openpyxl + python-dotenv.
- `stern-scheduler/src/components/scheduler/OffCalendarCoursesTable.tsx` — replaces AlternateSchedulesTable; shows Intensive + DBi.
- `stern-scheduler/.claude/settings.json` — project-scoped Claude Code permissions.
- `_system/working/{change-log,build-history,current-state}.md` — session logs (this file + siblings).

**Files modified:**
- `stern-scheduler/src/types/scheduler.ts` — 5 duration types, `MeetingPattern` interface, conflict functions iterate patterns.
- `stern-scheduler/src/components/scheduler/ScheduleCalendar.tsx` — primary-pattern-only event builder, off-calendar exclusion.
- `stern-scheduler/src/components/scheduler/CourseFinder.tsx` — 5-option duration filter, violet DBi badge.
- `stern-scheduler/src/hooks/useUserSchedule.ts` — `getOffCalendarCourses` rename.
- `stern-scheduler/src/pages/Index.tsx` — variable renames + new table import.
- `stern-scheduler/src/integrations/supabase/types.ts` — regenerated for new columns.
- `stern-scheduler/.gitignore` — exclude `scripts/ingest/.env` and `_*.sql`.

**Files deleted:**
- `stern-scheduler/src/components/scheduler/AlternateSchedulesTable.tsx` — replaced by OffCalendarCoursesTable.

**Decisions made:**
- Schema changes ship as one PR (migration + ingest + frontend bundled). Splitting would leave the app in a broken intermediate state.
- One DB row per Class Nbr, not one per pattern; `meeting_patterns` JSONB holds full fidelity. Calendar renders only the primary (longest in-person) pattern.
- 5 duration types instead of 6: dropped "Self Study" — no Fall classes are entirely async.
- Spring 2026 wipe destroys 31 user-saved course selections (custom event blocks preserved). User OK'd this since catalog is changing anyway.
- Service role key path for ingest auth. User created `scripts/ingest/.env`.
- `git push` stays in deny list — explicit human action required.

**Issues found and resolved:**
- `list_tables` MCP reported stale `rows: 0`; actual SQL counts were 333 courses + 43 user_schedules. Always verify via `SELECT COUNT(*)`.
- `parseMeetingDays` expects `Sa`/`Su` but Fall source uses single-letter `S`/`U`. Ingest remaps.
- Range Pats `M-U` / `M-S` / `M-FU` need explicit expansion.
- `supabase-py` install fails on Python 3.14. Switched to stdlib urllib.
- PowerShell `Set-Content -Encoding utf8` writes UTF-8 WITH BOM, broke python-dotenv parsing.
- Multi-pattern over-rendering on calendar; reverted to primary-only.
- DBi badge `purple-100/700` was barely visible; bumped to `violet-200/800`.
- Slot-click filter included off-calendar courses; added early return.
- "MSu 9-4" in off-calendar table read like recurrence; stripped day-letter prefix.

**Outstanding / next session:**
- 4 deferred UX items in `followups_fall_2026.md`.
- Verify live Lovable deploy at https://stern-scheduler.lovable.app/.
- Local dev server (port 8080) was still running at session end.

---
