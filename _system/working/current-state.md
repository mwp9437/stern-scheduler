# Current State — Stern Scheduler

**Last updated:** 2026-05-09

---

## Active Deliverables

- **Stern Scheduler app** — production at https://stern-scheduler.lovable.app/ (Lovable preview at https://id-preview--d14edadb-8d74-4ae8-b126-52f48d2cae05.lovable.app). Auto-deploys on push to `main`.
- **Fall 2026 catalog** — loaded into `public.courses` (258 courses, 72 multi-pattern). Spring 2026 data wiped.
- **Multi-scenario state** — `public.user_schedule_scenarios` (25 users backfilled into "Plan A", all `is_active=true`); `user_schedules` rows scoped via `scenario_id` FK with cascade.
- **Local dev server** — Claude Preview launches via `.claude/launch.json` config "stern-scheduler-dev" on port 8080. Uses nvm-windows Node at `C:\Users\mpezza\nvm\v20.20.1\` via PowerShell wrapper. Restart server (don't trust HMR) after long edit sequences.

## Workspace Architecture

Canonical project files live inside the `stern-scheduler/` git repo so cloud
Claude Code (claude.ai/code) sees the same context after cloning. The parent
OneDrive folder (`Stern Scheduler/`) keeps a CLAUDE.md *router stub* and
session-local `.claude/` config so a desktop session launched from that cwd
still works.

```
stern-scheduler/                                ← git repo (canonical, deploys to Lovable)
├── CLAUDE.md                                   ← project instructions (committed; cloud reads from here)
├── _system/working/                            ← session logs (committed)
│   ├── change-log.md                           ← rotating last-15-days log
│   ├── build-history.md                        ← append-only permanent record
│   └── current-state.md                        ← cold-start snapshot (this file)
├── .claude/
│   └── settings.json                           ← project permission rules (committed)
├── .env                                        ← VITE_SUPABASE_* publishable keys (committed; safe)
├── .gitignore                                  ← excludes scripts/ingest/.env, _*.sql, etc.
├── supabase/migrations/
│   ├── 20260211000639_64cebd31-...sql          ← feedback policy
│   ├── 20260430210000_fall_2026_schema_rework.sql
│   ├── 20260504120000_add_syllabus_url.sql
│   ├── 20260504160000_add_description_to_courses.sql
│   └── 20260509120000_add_user_schedule_scenarios.sql   ← NEW (today)
├── scripts/ingest/
│   ├── fall_2026.py                            ← Fall catalog upsert
│   ├── syllabus_links.py                       ← populates courses.syllabus_url from saved syllabilist HTML
│   ├── course_descriptions.py                  ← populates courses.description
│   ├── requirements.txt                        ← openpyxl, python-dotenv
│   ├── README.md                               ← setup + Spring 2027 re-run notes
│   └── .env                                    ← gitignored, holds SUPABASE_SERVICE_ROLE_KEY
└── src/
    ├── types/scheduler.ts                      ← 5 duration types, MeetingPattern, helpers
    │                                              + parseDateSpanDays, isShortSpan,
    │                                              formatOffCalendarTime (NEW)
    ├── hooks/
    │   ├── useCourses.ts
    │   ├── useUserSchedule.ts                  ← (refactored) scenarioId arg, swapCourse,
    │   │                                          addCustomEvents batch
    │   ├── useScenarios.ts                     ← NEW — list/create/duplicate/rename/delete/setActive
    │   └── useAuth.ts
    ├── components/scheduler/
    │   ├── ScheduleCalendar.tsx                ← handleSelectEvent now fires for courses too
    │   ├── CourseFinder.tsx                    ← date-range display for off-cal/short-span
    │   ├── OffCalendarCoursesTable.tsx         ← uses shared formatOffCalendarTime
    │   ├── ScenarioSwitcher.tsx                ← NEW — dropdown + dialogs + alert dialog
    │   ├── CourseDetailModal.tsx               ← NEW — info + remove + section swap
    │   ├── Header.tsx                          ← scenarioSwitcher slot + refreshed User Guide
    │   ├── Footer.tsx, AddEventModal.tsx       ← AddEventModal: day chips + tabs + course list
    │   ├── AuthModal.tsx, FeedbackModal.tsx, FundraiserModal.tsx
    ├── pages/Index.tsx                         ← useScenarios + auto-create + CourseDetailModal
    └── integrations/supabase/
        ├── client.ts
        └── types.ts                            ← regenerated; includes user_schedule_scenarios

Stern Scheduler/                                ← desktop Claude Code cwd (NOT a git repo)
├── CLAUDE.md                                   ← single-line router: `@stern-scheduler/CLAUDE.md`
└── .claude/
    ├── settings.local.json                     ← session-mirror of project rules + legacy approvals
    └── launch.json                             ← Claude Preview server config (PowerShell wrapper for nvm Node)
```

## Database Schema

### `public.courses` (unchanged from 2026-05-04)

| Column              | Type                | Notes                                              |
|---------------------|---------------------|----------------------------------------------------|
| `id`                | bigint identity     | PK                                                 |
| `class_nbr`         | text                | UNIQUE — natural key for upsert                    |
| `subject`           | text                | "ACCT-GB"                                          |
| `catalog`           | text                | "2303"                                             |
| `course_title`      | text                | "Financial Statement Analysis" (clean)             |
| `course_name`       | text                | legacy; ingest now populates as title              |
| `section`           | text                | "01"                                               |
| `credits`           | numeric             |                                                    |
| `instructor`        | text                |                                                    |
| `session_code`      | text                | "DFT", "DM1", "INS", "XTL", etc.                   |
| `duration_type`     | text                | 5 buckets — "Full Semester" / "First Half" / "Second Half" / "Intensive" / "DBi" |
| `mode`              | text                | "P", "OL", "OB"                                    |
| `term_code`         | text                | "1268" for Fall 2026                               |
| `meeting_days`      | text                | letters M T W R F Sa Su (primary pattern)          |
| `start_time`        | time                |                                                    |
| `end_time`          | time                |                                                    |
| `dates_full`        | text                | "MM/DD-MM/DD" (primary pattern)                    |
| `meeting_times_full`| text                | "MW 1:30 pm - 2:50 pm" (primary pattern)           |
| `meeting_patterns`  | jsonb               | array of `{pat_nbr, meeting_days, start_time, end_time, dates_full, is_async}` |
| `syllabus_url`      | text                |                                                    |
| `description`       | text                |                                                    |
| `notes`             | text                | secondary descr + non-default mode + secondary patterns |
| `created_at`        | timestamptz         |                                                    |

### `public.user_schedule_scenarios` (NEW 2026-05-09)

| Column        | Type        | Notes                                  |
|---------------|-------------|----------------------------------------|
| `id`          | uuid        | PK, default `gen_random_uuid()`        |
| `user_id`     | uuid        | FK → auth.users(id) ON DELETE CASCADE  |
| `name`        | text        | NOT NULL                               |
| `is_active`   | boolean     | NOT NULL, default false                |
| `created_at`  | timestamptz | NOT NULL, default now()                |

Constraints: `UNIQUE (user_id, name)`; partial unique index `(user_id) WHERE is_active` (exactly one active per user).
RLS: owner-only on all CRUD (`user_id = auth.uid()`).

### `public.user_schedules` (UPDATED 2026-05-09)

Added: `scenario_id uuid NOT NULL REFERENCES user_schedule_scenarios(id) ON DELETE CASCADE`. Index on `(scenario_id)` for scoped reads.
All existing rows backfilled with `scenario_id` of their user's "Plan A" scenario; 0 nulls verified.

### `public.app_feedback` (unchanged)

Cols: `feedback_type`, `message`, `user_email` (nullable). RLS: permissive INSERT for anon + authenticated; no SELECT/UPDATE/DELETE for users.

## Outstanding Items (prioritized)

### Verification (this session's commits)
- Manually verify logged-in flows on https://stern-scheduler.lovable.app/ after Lovable redeploy:
  - Scenario backfill: existing user sees "Plan A" with their original courses + custom events intact.
  - Scenario switcher: create "Plan B" → calendar empties → add a course → switch back → original schedule untouched.
  - Duplicate "Plan A" → "Plan A (copy)" with cloned rows, edits don't bleed across.
  - Rename to existing name → toast error, dialog stays open.
  - Delete active scenario → next-most-recent becomes active.
  - Click a course block on calendar → CourseDetailModal opens with description + sibling sections.
  - Section swap: click Swap → old section gone, new section in calendar, no flicker.
  - Multi-day custom block: double-click Mon slot, MWF chips → 3 events on M/W/F with single toast.
  - Slot-double-click "Pick a Course" tab: lists courses meeting at that time; click Add closes modal and adds the course.

### Roadmap (next batch, in priority order)
1. **Side-by-side scenario compare view** — render two scenarios on the same calendar with different visual treatments + merged stats. (Item 1 of original wishlist v2.)
2. **Mobile / responsive support** — Course Finder + calendar layout on phone-width viewports (stacked or drawer-based pattern).
3. **Persist footer collapse state** in localStorage; add tooltip on collapse button.
4. **Rate limiting / abuse protection** on feedback form.
5. **Admin view** for feedback submissions.

### Maintenance
- Spring 2027 catalog ingest (when xlsx is available): copy `scripts/ingest/fall_2026.py` to `spring_2027.py`, swap defaults, `--dry-run` to spot any new Session codes, run. See `scripts/ingest/README.md → "For Spring 2027"`.

## File Map (key files)

| File | Purpose |
|------|---------|
| `stern-scheduler/CLAUDE.md` | Project instructions Claude Code reads first. Source of truth for product, conventions, decisions. |
| `stern-scheduler/.claude/settings.json` | Project-scoped permissions (committed). Auto-allow routine ops + non-force `git push`; deny destructive git/.env edits. |
| `Stern Scheduler/.claude/settings.local.json` | Session-active mirror. |
| `Stern Scheduler/.claude/launch.json` | Claude Preview launch config; PowerShell wrapper around npm to inject nvm Node into PATH. |
| `stern-scheduler/scripts/ingest/fall_2026.py` | Catalog ingest. Idempotent upsert via `INSERT ... ON CONFLICT (class_nbr) DO UPDATE`. |
| `stern-scheduler/src/types/scheduler.ts` | All scheduler types + helpers — duration types, MeetingPattern, conflict detection, parseDateSpanDays / isShortSpan / formatOffCalendarTime. |
| `stern-scheduler/src/hooks/useScenarios.ts` | Multi-scenario CRUD + setActive. |
| `stern-scheduler/src/hooks/useUserSchedule.ts` | scenario-scoped schedule reads/writes; swapCourse + addCustomEvents batch. |
| `stern-scheduler/src/components/scheduler/ScenarioSwitcher.tsx` | Header dropdown + name dialogs + delete confirmation. |
| `stern-scheduler/src/components/scheduler/CourseDetailModal.tsx` | Course click → details + remove + section swap. |
| `stern-scheduler/src/components/scheduler/AddEventModal.tsx` | Day-chip selector + Custom Block / Pick a Course tabs. |
| `stern-scheduler/src/pages/Index.tsx` | Top-level wiring: useScenarios + auto-create "Plan A" + modal routing. |
| `stern-scheduler/supabase/migrations/` | Timestamped, never edited after creation. |

## Live URLs / Credentials

- Production: https://stern-scheduler.lovable.app/
- Lovable preview: https://id-preview--d14edadb-8d74-4ae8-b126-52f48d2cae05.lovable.app
- Supabase project: `rzlsqivbgojatxxvrywl` (https://supabase.com/dashboard/project/rzlsqivbgojatxxvrywl)
- GitHub: https://github.com/mwp9437/stern-scheduler (main branch deploys)
- PMC fundraiser: https://profile.pmc.org/MP0430

## Environment quirks (won't surprise you next time)

- Node lives at `C:\Users\mpezza\nvm\v20.20.1\` (nvm-windows). Not in default PATH for Bash or PowerShell unless wrapper sets it.
- Project lives in OneDrive — if file reads fail, start `C:\Program Files\Microsoft OneDrive\OneDrive.exe` to rehydrate.
- Supabase service role key uses new `sb_secret_<...>` format (~41 chars), not a JWT.
- `supabase-py` doesn't install on Python 3.14 (pyiceberg). Use stdlib urllib pattern from `fall_2026.py`.
- PowerShell 5.1 `Set-Content -Encoding utf8` writes BOM. Strip when writing config files.
- **HMR after many edits**: when bouncing between many sequential `Edit`s during a feature build, the dev server can hold stale fiber state and report false "change in order of Hooks" warnings on stable code. `preview_stop` + `preview_start` clears it. Don't trust the buffered console; restart and re-check.
