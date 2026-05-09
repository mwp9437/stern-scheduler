# CLAUDE.md

Context for Claude Code working on **Stern Scheduler**.

## Product

- **Objective:** A web-based course planning tool that helps NYU Stern MBA students build, visualize, and stress-test their semester schedules (courses + internship/recruiting/personal time blocks) on a single calendar view.
- **Primary persona:** NYU Stern MBA students, including 2Y full-time students juggling coursework + internships + recruiting, and Langone (part-time) students balancing coursework with full-time jobs.
- **Core problem:** NYU's official registration tools don't let students visualize courses + internship hours + recruiting commitments together, calculate true total weekly load, or quickly explore alternate-schedule courses against a fixed weekly grid.
- **Origin:** Built by a current NYU Stern FT MBA student to scratch a personal scheduling pain point and share it with classmates. The creator runs an annual Pan-Mass Challenge fundraiser referenced in-app.

## Current state

### Shipped (working end-to-end)
- Course catalog browsing from Supabase `courses` table with search, subject filter, "selected only" toggle, credit/duration/meeting-time filters, hide-conflicts toggle
- Course Finder side panel with collapsible/expandable layout (arrow icon toggle); two-line duration badges for half-semester (`1st Half` / `2nd Half`), single-line for the rest (`Full`, `Int`, `DBi`)
- Add/remove courses to personal schedule (persisted in `user_schedules`)
- Weekly calendar view via `react-big-calendar` with course blocks (light purple), internship (light blue), recruiting (light orange), personal (light green)
- Custom event creation via double-click on calendar slot; drag-to-move and resize for custom events
- Single-click slot → filters Course Finder to courses meeting at that day/time (off-calendar courses excluded from this filter)
- Conflict detection (overlapping `meeting_days` + overlapping time ranges); iterates `meeting_patterns` so non-primary blocks register as conflicts too
- **Off-Calendar Courses table** below calendar — renders for selected `Intensive` (INS/INW) and `DBi` (XTL global immersion) courses that don't fit a weekly recurring pattern. Calendar `flex-grow`s to fill space when empty.
- Stats in header: Total Credits, Internship Hours, Recruiting Hours, Total Scheduled Load (credits + intern hrs + recruiting hrs)
- **Syllabus URLs** on calendar event blocks (small external-link icon, opens NYU's Shibboleth-protected syllabus page in a new tab)
- **Course descriptions** in a hover card on calendar blocks and Course Finder rows (via shadcn HoverCard)
- Supabase Auth (email/password) via `AuthModal` + `useAuth` hook
- Reduced calendar cell vertical height to fit 9am - 9pm on desktop screen
- Footer with collapse/expand toggle (right side, ChevronUp/ChevronDown)
- **Smart Fundraiser Modal**: increments `stern_scheduler_visit_count` in localStorage on each load; shows on visits 2, 5, 10, and every 10th after; links to PMC donation page + Venmo `@mikepezza`. Runs year-round, same link.
- **Feedback modal**: Header button opens form (Bug Report / Feature Request / General Feedback + message + optional email); writes to `app_feedback` table with permissive INSERT RLS for anon + authenticated

### In-progress / partially built
- (none currently — most known gaps moved into Roadmap below)

### Known issues / rough edges
- No rate limiting on feedback submissions (spam risk acknowledged but deferred)
- `app_feedback` has INSERT-only access for users; no admin UI to view submissions, must read via Supabase dashboard
- Mobile/responsive behavior of the split calendar + Course Finder layout has not been thoroughly tested. The app must work on mobile (see Roadmap).
- Footer collapse state is not persisted across reloads
- Footer collapse button has no tooltip yet

## Roadmap

The next-batch wishlist (in roughly priority order):

1. **Multiple saved schedules per user (Plan A / Plan B)** — currently `user_schedules` is single-scenario. Need a `user_schedule_scenarios` table (or `scenario_name` column) plus a Header selector to compare scenarios side-by-side.
2. **Custom blocks: multi-day from one modal** — let users enter "MWF 2-4pm" once instead of creating 3 events. Emit N rows on submit; no schema change.
3. **Click-to-edit course block on calendar** — `ScheduleCalendar.handleSelectEvent` only opens the modal for custom events today; extend to courses with a "Remove from schedule" / "Swap" UI.
4. **Slot-double-click modal includes searchable course list** — show courses meeting at the clicked slot inside the AddEventModal so users can pick a course directly.
5. **Off-calendar courses in CourseFinder list — clarify dates inline** — strip day-letter prefix or show date range so "MSu 9-4 (8/30-8/31)" doesn't read like a weekly recurrence.
6. **Mobile/responsive support** — Course Finder + calendar layout needs to work cleanly on phone-width viewports. Stacked or drawer-based pattern.
7. **Persist footer collapse state** in localStorage; add tooltip on collapse button.
8. **Rate limiting / abuse protection** on feedback form.
9. **Admin view** for feedback submissions.

## Out of scope / decided against

- **No mock data**: always query Supabase `courses` table
- **No alternative calendar libraries**: `react-big-calendar` is mandatory
- **No alternative frontend frameworks**: React + Vite + Tailwind + shadcn only
- **No storing roles on profiles/users tables** (project-wide Lovable convention; not currently applicable since there are no roles yet)
- **Custom color classes in components are disallowed**: must use semantic tokens from `index.css` / `tailwind.config.ts`
- **No paid features / Stripe integration** [VERIFY: not formally ruled out, just not on roadmap]

## Stack and architecture

### Frontend
- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS v3 + shadcn/ui components
- `lucide-react` icons
- `date-fns` for time/date math
- `react-big-calendar` for the weekly grid
- `@tanstack/react-query` for data fetching/caching

### Backend (Supabase)
- Supabase project ref: **`rzlsqivbgojatxxvrywl`**
- Lovable project ID: `d14edadb-8d74-4ae8-b126-52f48d2cae05`
- Tables:
  - **`courses`** — read-only catalog. One row per Class Nbr; multi-pattern source rows are collapsed and the full pattern list lives in `meeting_patterns` (JSONB). Public SELECT.
    - Identity: `id` (bigint), `class_nbr` (text, UNIQUE)
    - Source-format columns (mirrors Stern admin xlsx): `subject`, `catalog`, `course_title`, `section`, `credits`, `instructor`, `session_code`, `mode`, `term_code`
    - `duration_type` ∈ `{"Full Semester", "First Half", "Second Half", "Intensive", "DBi"}` — derived from Session code on ingest, no date heuristic
    - Primary-pattern flat columns (the longest in-person block): `meeting_days`, `start_time`, `end_time`, `dates_full`, `meeting_times_full`
    - `meeting_patterns` (jsonb array of `{pat_nbr, meeting_days, start_time, end_time, dates_full, is_async}`)
    - Enrichments: `syllabus_url`, `description`, `notes` (secondary descr + non-default mode + secondary patterns), `course_name` (legacy; populated as title-only)
  - **`user_schedules`** — user's selected courses + custom events. Cols: `user_id`, `course_id` (nullable; FK to courses.id), `custom_event_type` (lowercase: `internship` | `recruiting` | `personal`), `custom_title`, `start_time`, `end_time`. RLS: owner-only on all CRUD.
  - **`app_feedback`** — feedback submissions. Cols: `feedback_type`, `message`, `user_email` (nullable). RLS: permissive INSERT for `anon` + `authenticated`; no SELECT/UPDATE/DELETE for users.

### Auth
- Supabase email/password via `useAuth` hook
- `onAuthStateChange` listener set up before initial `getSession` call (per Lovable best practice)
- Anonymous browsing allowed; auth gate triggers on attempt to add courses or create custom events

### Integrations
- Pan-Mass Challenge donation link: `https://profile.pmc.org/MP0430` (year-round)
- Venmo handle: `@mikepezza`
- No other third-party APIs

### Hosting / deploy
- Built and deployed via Lovable platform
- Preview: `https://id-preview--d14edadb-8d74-4ae8-b126-52f48d2cae05.lovable.app`
- Published: `https://stern-scheduler.lovable.app`
- Migrations live in `supabase/migrations/` (timestamped, never edited after creation)

## Data ingest

Catalog data comes from per-semester Stern admin exports (xlsx) plus two enrichment sources (syllabilist HTML, catalog descriptions markdown). Per-semester strategy: wipe + reload, no accumulating term column. See `scripts/ingest/README.md` for the full workflow.

### Pipeline
1. **Catalog xlsx → courses** via `scripts/ingest/fall_2026.py` (idempotent upsert keyed on `class_nbr`). Reads xlsx with `openpyxl(data_only=True)` so Excel serial dates and decimal day-fractions are pre-converted. Writes via PostgREST + `SUPABASE_SERVICE_ROLE_KEY` (stdlib `urllib`; supabase-py won't build on Python 3.14).
2. **Syllabilist HTML → courses.syllabus_url** via `scripts/ingest/syllabus_links.py`. The page is Shibboleth-protected so users save it locally first.
3. **Catalog markdown → courses.description** via `scripts/ingest/course_descriptions.py`. Match key `(subject, catalog)` — every section gets the same description.

### Source-format gotchas (Fall 2026 xlsx)
- Day-letter convention: `S` = Saturday, `U` = Sunday. Ingest remaps to `Sa` / `Su` (the convention `parseMeetingDays` expects).
- Range `Pat` values used by intensives and DBi: `M-U` → `MTWRFSaSu`, `M-S` → `MTWRFSa`, `M-FU` → `MTWRFSu`. Expand on ingest.
- `Session` code is the canonical signal for `duration_type` — never derive from date math:
  - `DFT`, `EFT` → "Full Semester"
  - `DM1`, `EM1`, `S` → "First Half"
  - `DM2`, `EM2` → "Second Half"
  - `INS`, `INW` → "Intensive"
  - `XTL` → "DBi" (J-term global immersion trips, e.g. Costa Rica, Mexico, Australia)
  - Unknown codes raise loudly so future ingests can't silently misclassify.
- A Class Nbr can appear in multiple source rows (one per `Pat Nbr`). The "primary" pattern (longest in-person block) populates the flat columns; the full list lives in `meeting_patterns`. Calendar renders only the primary.

### Spring 2027 re-run
Mostly a copy of `fall_2026.py`. See `scripts/ingest/README.md → "For Spring 2027"`.

## Key conventions observed

### UI/UX patterns
- Tight, dense layouts: user repeatedly asks to reduce padding/margins (footer `py-2`, calendar cell heights, calendar→footer gap)
- Icon-only action buttons (`h-5 w-5`) paired with stacked text badges in narrow columns
- Two-column flex with **action+badge on left, truncated content on right** to prevent long titles pushing buttons off-screen
- Collapse/expand toggles with chevron icons (Course Finder, Footer)
- Modals over inline forms for secondary actions (auth, add event, feedback, fundraiser)
- Toast notifications for write confirmations
- Semantic color palette is fixed and meaningful: purple=course, blue=internship, orange=recruiting, green=personal; duration badges use blue (1st Half), orange (2nd Half), green (Full), muted (Intensive), violet (DBi)

### Code style
- Semantic Tailwind tokens only, never raw `bg-white`, `text-black`
- HSL color values in `index.css` and `tailwind.config.ts`
- shadcn component variants extended via `cva` rather than ad-hoc class overrides
- Custom event types stored **lowercase** in DB; `EVENT_TYPE_LABELS` maps to display strings
- Hooks in `src/hooks/`, scheduler components in `src/components/scheduler/`, shadcn primitives in `src/components/ui/`

### Feature scoping
- User prefers **small, targeted, atomic changes**, often sends multi-point styling tweaks ("4 specific UI updates") rather than vague redesigns
- When something regresses (e.g., alternate table cut off), expects immediate restore + the new feature, not a rollback
- Comfortable iterating: send change, check preview, send next refinement

### Workflow
- Frequently uses preview viewport (~856×505), small laptop-ish size, so density matters on desktop
- Mobile must also work cleanly (phone-width viewports), even though desktop is the primary use case
- Reports bugs with reproducible context ("I get an error when I submit feedback") and expects investigation before code changes

## How to work with me

- I drive Claude Code from two surfaces: **desktop** (Claude Code in the Claude desktop app, with full local tooling — Vite preview, screenshots, MCPs) and **cloud** (claude.ai/code, including the mobile app, which clones this repo). CLAUDE.md and `_system/working/` live in the repo so both surfaces share the same project context.
- Lovable is the deploy mechanism only (GitHub push to `main` → Lovable auto-deploy → live at stern-scheduler.lovable.app). I don't make edits in Lovable's UI anymore. All code, schema, and docs changes go through Claude Code.
- Before any non-trivial change, state the plan in 2-3 bullets and wait for my OK. "Non-trivial" means: touches more than one file, changes a public API, modifies the schema, or alters user-facing behavior. Pure formatting fixes and obvious typos can proceed without confirmation.
- Prefer small atomic commits with clear messages over batched changes. Commit message style: imperative mood, scope-prefixed when natural (e.g., `feedback: add rate limit`, `calendar: shrink cell height`).
- When fixing a bug, investigate first (read the code, form a hypothesis), then propose a fix. Don't pattern-match to "looks similar to a bug I've seen" without reading the actual code path.
- Don't add features I didn't ask for, even if they seem like obvious improvements. If you spot something worth doing, mention it and ask, don't ship it silently. Exception: small obvious cleanups directly adjacent to the change you're making.
- When uncertain between two reasonable approaches, present both with tradeoffs rather than picking and proceeding.
- Push to `main` triggers Lovable redeploy automatically. No staging environment.
- If Lovable's UI ever auto-syncs changes to GitHub that I didn't request, flag it. We may need to disable auto-sync or migrate off Lovable entirely.
- `git push` is in the project's deny list intentionally — explicit human action required, even when I say "approve."

## Key files and their roles

- **`src/pages/Index.tsx`** — top-level layout; orchestrates Header, ScheduleCalendar, OffCalendarCoursesTable, CourseFinder, Footer, and all modals; owns modal open/close state and the slot-filter state
- **`src/components/scheduler/ScheduleCalendar.tsx`** — `react-big-calendar` wrapper; renders course events (primary pattern only) + custom events; handles drag/resize and slot click/double-click; embeds syllabus link + description hover card on each course block
- **`src/components/scheduler/CourseFinder.tsx`** — right-side panel; search, filters, course list with add/remove, collapse toggle, time-slot filter chip, description hover card
- **`src/components/scheduler/OffCalendarCoursesTable.tsx`** — conditionally rendered below calendar when off-calendar (Intensive or DBi) courses are selected. Strips day-letter prefix from Meeting Times so dates column carries the actual schedule.
- **`src/hooks/useCourses.ts`** — fetches `courses` table; provides `useFilteredCourses` and `getUniqueSubjects` helpers
- **`src/hooks/useUserSchedule.ts`** — owns all `user_schedules` mutations (toggle course, add/update/delete custom events) + `calculateStats` + `getOffCalendarCourses`
- **`src/hooks/useAuth.ts`** — Supabase auth wrapper; sets up `onAuthStateChange` before `getSession`
- **`src/types/scheduler.ts`** — `Course`, `UserSchedule`, `CustomEventType`, `ScheduleStats`, `TimeSlotFilter`, `CalendarEvent`, `MeetingPattern`, `EVENT_TYPE_LABELS`, `isOffCalendar`/`isCalendarVisible`/`isHalfSemester` helpers, conflict detection (`coursesConflict`, `courseConflictsWithEvent`, `courseMeetsAtTime`)
- **`src/components/scheduler/FundraiserModal.tsx`** — visit-count localStorage logic + PMC modal
- **`src/components/scheduler/FeedbackModal.tsx`** — feedback form → `app_feedback` insert
- **`src/index.css`** — design tokens (HSL), calendar cell height overrides, semantic colors
- **`scripts/ingest/`** — Python ingest pipeline (`fall_2026.py`, `syllabus_links.py`, `course_descriptions.py`) plus README. Service role key in gitignored `.env`.
- **`_system/working/`** — session logs (change-log, build-history, current-state) for cold-start handoff between sessions and surfaces.
- **`.claude/settings.json`** — project-scoped Claude Code permissions: auto-allow routine reads/edits/git/npm/Supabase reads; require confirmation for `git push`, destructive git, npm install of new packages, .env edits, workflow edits, Supabase project lifecycle.

### Non-obvious relationships
- `Index.tsx` derives `hasOffCalendarCourses` from `useUserSchedule.getOffCalendarCourses` and passes it to `ScheduleCalendar` (affects calendar height) AND uses it to conditionally mount `OffCalendarCoursesTable`. Both must stay in sync.
- `useUserSchedule.calculateStats` depends on `customEvents` having lowercase `custom_event_type` strings matching DB values. Case mismatch silently zeros out hours.
- `FundraiserModal` mounts unconditionally in `Index.tsx`; its visibility is governed entirely by localStorage on mount (no parent state).
- Conflict detection iterates `meeting_patterns` (not just the flat columns), so a multi-pattern Intensive whose secondary block overlaps a Full Semester course's weekly slot still registers as conflicting.
- Off-calendar courses (Intensive, DBi) are excluded from `courseMeetsAtTime` — they don't recur weekly, so including them in the slot-click filter would be misleading.

## Open questions

(none open — semester strategy resolved as per-semester wipe-and-reload; multi-scenario support is on the roadmap as item 1)
