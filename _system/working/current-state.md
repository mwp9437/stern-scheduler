# Current State — Stern Scheduler

**Last updated:** 2026-05-01

---

## Active Deliverables

- **Stern Scheduler app** — production at https://stern-scheduler.lovable.app/ (Lovable preview at https://id-preview--d14edadb-8d74-4ae8-b126-52f48d2cae05.lovable.app). Auto-deploys on push to `main`.
- **Fall 2026 catalog** — loaded into `public.courses` (258 courses, 72 multi-pattern). Spring 2026 data wiped.
- **Local dev server** — Claude Preview launches via `.claude/launch.json` config "stern-scheduler-dev" on port 8080. Uses nvm-windows Node at `C:\Users\mpezza\nvm\v20.20.1\` via PowerShell wrapper.

## Workspace Architecture

The canonical project files live inside the `stern-scheduler/` git repo so cloud
Claude Code (claude.ai/code) can read them after cloning. The parent OneDrive
folder (`Stern Scheduler/`) keeps a CLAUDE.md *router stub* and session-local
`.claude/` config so a desktop session launched from that cwd still works.

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
│   ├── 20260430210000_fall_2026_schema_rework.sql
│   ├── 20260504120000_add_syllabus_url.sql
│   └── 20260504160000_add_description_to_courses.sql
├── scripts/ingest/
│   ├── fall_2026.py                            ← Fall catalog upsert
│   ├── syllabus_links.py                       ← populates courses.syllabus_url from saved syllabilist HTML
│   ├── course_descriptions.py                  ← populates courses.description
│   ├── requirements.txt                        ← openpyxl, python-dotenv
│   ├── README.md                               ← setup + Spring 2027 re-run notes
│   └── .env                                    ← gitignored, holds SUPABASE_SERVICE_ROLE_KEY
└── src/
    ├── types/scheduler.ts                      ← 5 duration types, MeetingPattern, helpers
    ├── hooks/{useCourses,useUserSchedule,useAuth}.ts
    ├── components/scheduler/
    │   ├── ScheduleCalendar.tsx                ← primary-pattern event builder + syllabus link + description hover card
    │   ├── CourseFinder.tsx                    ← 5-option duration filter, violet DBi badge, description hover
    │   ├── OffCalendarCoursesTable.tsx         ← Intensive + DBi listing (was AlternateSchedulesTable)
    │   ├── Header.tsx, Footer.tsx, AddEventModal.tsx, AuthModal.tsx,
    │   │   FeedbackModal.tsx, FundraiserModal.tsx
    ├── pages/Index.tsx                         ← top-level layout
    └── integrations/supabase/
        ├── client.ts
        └── types.ts                            ← regenerated; includes syllabus_url + description

Stern Scheduler/                                ← desktop Claude Code cwd (NOT a git repo)
├── CLAUDE.md                                   ← single-line router: `@stern-scheduler/CLAUDE.md`
└── .claude/
    ├── settings.local.json                     ← session-mirror of project rules + legacy approvals
    └── launch.json                             ← Claude Preview server config (PowerShell wrapper for nvm Node)
```

## Database Schema (`public.courses`, post-rework)

| Column              | Type                | Notes                                              |
|---------------------|---------------------|----------------------------------------------------|
| `id`                | bigint identity     | PK                                                 |
| `class_nbr`         | text                | UNIQUE — natural key for upsert                    |
| `subject`           | text                | "ACCT-GB"                                          |
| `catalog`           | text                | NEW — "2303"                                       |
| `course_title`      | text                | NEW — "Financial Statement Analysis" (clean)       |
| `course_name`       | text                | legacy; ingest now populates as title              |
| `section`           | text                | "01"                                               |
| `credits`           | numeric             |                                                    |
| `instructor`        | text                | "Yeo,Julian"                                       |
| `session_code`      | text                | NEW — "DFT", "DM1", "INS", "XTL", etc.             |
| `duration_type`     | text                | "Full Semester" \| "First Half" \| "Second Half" \| "Intensive" \| "DBi" |
| `mode`              | text                | NEW — "P", "OL", "OB"                              |
| `term_code`         | text                | NEW — "1268" for Fall 2026                         |
| `meeting_days`      | text                | letters M T W R F Sa Su (primary pattern)          |
| `start_time`        | time                | primary pattern                                    |
| `end_time`          | time                | primary pattern                                    |
| `dates_full`        | text                | "MM/DD-MM/DD" (primary pattern)                    |
| `meeting_times_full`| text                | "MW 1:30 pm - 2:50 pm" (primary pattern)           |
| `meeting_patterns`  | jsonb               | NEW — array of `{pat_nbr, meeting_days, start_time, end_time, dates_full, is_async}` |
| `syllabus_url`      | text                | NEW (2026-05-04) — populated by `scripts/ingest/syllabus_links.py` from saved syllabilist HTML |
| `description`       | text                | NEW (2026-05-04) — populated by `scripts/ingest/course_descriptions.py`; renders in CourseFinder + ScheduleCalendar hover card |
| `notes`             | text                | secondary descr + non-default mode + secondary patterns |
| `created_at`        | timestamptz         |                                                    |

Constraints: `UNIQUE (class_nbr)`, `CHECK (meeting_patterns IS NULL OR jsonb_typeof = 'array')`, `GIN (meeting_patterns jsonb_path_ops)`.

## Outstanding Items (prioritized)

### Verification
- Confirm live deploy at https://stern-scheduler.lovable.app/ rendered cleanly post-push of commit `26dea54`. Quick checks: 258 courses load, badges show 5 types, off-calendar table appears for Intensive/DBi selections.

### Followup features (deferred, none gating)
1. **Custom blocks multi-day modal** — let user enter "MWF 2-4pm" once instead of 3 events. Touches `AddEventModal.tsx`, `useUserSchedule.addCustomEvent`.
2. **Click-to-edit class block** — currently only custom events open the edit modal. `ScheduleCalendar.handleSelectEvent` filters to `type === "custom"`; extend.
3. **Slot-double-click modal includes searchable course list** — when adding a custom block, also offer courses meeting at that slot.
4. **Off-calendar entries in CourseFinder list** — strip the day-letter prefix the same way the off-calendar table does (or show date range inline) to clarify one-weekend intensives.

### Maintenance
- For Spring 2027: copy `scripts/ingest/fall_2026.py` to `spring_2027.py`, swap defaults, dry-run to spot any new Session codes, run.

## File Map (key files)

| File | Purpose |
|------|---------|
| `stern-scheduler/CLAUDE.md` | Project instructions Claude Code reads first. Source of truth for roadmap, conventions, decisions. |
| `stern-scheduler/.claude/settings.json` | Project-scoped permissions (committed). Auto-allow routine ops; deny push/destructive git/.env edits. |
| `.claude/settings.local.json` (parent) | Session-active mirror so current Claude Code session inherits the rules. |
| `.claude/launch.json` (parent) | Claude Preview launch config; PowerShell wrapper around npm to inject nvm Node into PATH. |
| `stern-scheduler/scripts/ingest/fall_2026.py` | Catalog ingest. Idempotent upsert via `INSERT ... ON CONFLICT (class_nbr) DO UPDATE`. |
| `stern-scheduler/src/types/scheduler.ts` | All scheduler types + helpers. `isOffCalendar`, `isCalendarVisible`, `MeetingPattern`, conflict detection. |
| `stern-scheduler/supabase/migrations/` | Timestamped migrations, never edited after creation. |

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
