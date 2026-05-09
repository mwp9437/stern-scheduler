# CLAUDE.md

Context for Claude Code working on **Stern Scheduler**.

## Product

- **Objective:** A web-based course planning tool that helps NYU Stern MBA students build, visualize, and stress-test their semester schedules (courses + internship/recruiting/personal time blocks) on a single calendar view.
- **Primary persona:** NYU Stern MBA students, including 2Y full-time students juggling coursework + internships + recruiting, and Langone (part-time) students balancing coursework with full-time jobs.
- **Core problem:** NYU's official registration tools don't let students visualize courses + internship hours + recruiting commitments together, calculate true total weekly load, or quickly explore alternate-schedule courses against a fixed weekly grid.
- **Origin:** Built by a current NYU Stern FT MBA student to scratch a personal scheduling pain point and share it with classmates. The creator runs an annual Pan-Mass Challenge fundraiser referenced in-app.

## Current state

### Shipped (working end-to-end)
- Course catalog browsing from Supabase `courses` table with search, subject filter, and "selected only" toggle
- Course Finder side panel with collapsible/expandable layout (arrow icon toggle), two-line duration badges ("1st"/"Half", "2nd"/"Half", "Full", "Alt")
- Add/remove courses to personal schedule (persisted in `user_schedules`)
- Weekly calendar view via `react-big-calendar` with course blocks (light purple), internship (light blue), recruiting (light orange), personal (light green)
- Custom event creation via double-click on calendar slot; drag-to-move and resize for custom events
- Single-click slot → filters Course Finder to courses meeting at that day/time
- Conflict detection (overlapping `meeting_days` + overlapping time ranges)
- Half-semester parsing from `dates_full` string (Spring: start < Feb 15 → 1st Half, start > Feb 15 → 2nd Half) (NOTE: THIS LOGIC NEEDS TO BE UPDATED BSAED ON NEW DATA FORMAT + FALL 2026)
- Alternate Schedules table below calendar (only renders when alternate-schedule courses are selected; calendar `flex-grow`s to fill space when empty)
- Stats in header: Total Credits, Internship Hours, Recruiting Hours, Total Scheduled Load (credits + intern hrs + recruiting hrs)
- Supabase Auth (email/password) via `AuthModal` + `useAuth` hook
- Reduced calendar cell vertical height to fit 9am - 9pm on desktop screen
- Footer with collapse/expand toggle (right side, ChevronUp/ChevronDown)
- **Smart Fundraiser Modal**: increments `stern_scheduler_visit_count` in localStorage on each load; shows on visits 2, 5, 10, and every 10th after; links to PMC donation page + Venmo `@mikepezza`. Runs year-round, same link (PMC accepts donations all year).
- **Feedback modal**: Header button opens form (Bug Report / Feature Request / General Feedback + message + optional email); writes to `app_feedback` table with permissive INSERT RLS for anon + authenticated

### In-progress / partially built
- Footer collapse state is **not persisted** across reloads (suggested but not implemented) [VERIFY]
- Footer collapse button has no tooltip yet (suggested but not implemented) [VERIFY]

### Known issues / rough edges
- No rate limiting on feedback submissions (spam risk acknowledged but deferred)
- `app_feedback` has INSERT-only access for users; no admin UI to view submissions, must read via Supabase dashboard
- Mobile/responsive behavior of the split calendar + Course Finder layout has not been thoroughly tested. The app must work on mobile (see Roadmap), so any layout changes should be evaluated at narrow viewports.

## Roadmap

Roughly prioritized:
1. **Fall 2026 catalog ingest**: source data uses a different schema than Spring (see "Data ingest" below). Needs a transform layer before loading into `courses` or we need to rework the 'courses' database [COMPLETE]
2. **Mobile/responsive support**: Course Finder + calendar layout needs to work cleanly on phone-width viewports. The current desktop-first split layout will need a stacked or drawer-based pattern on narrow widths.
2.5. support multiple saved schedule scenarios per user (e.g., "Plan A" vs "Plan B")?
3. Persist footer collapse state in localStorage
4. Rate limiting / abuse protection on feedback form
5. Admin view for feedback submissions 

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
  - **`courses`**: read-only catalog. Key cols: `course_name`, `instructor`, `start_time`, `end_time`, `meeting_days` (M/T/W/R/F/Sa/Su), `duration_type` ("Full Semester" / "Half Semester" / "Alternate Schedule"), `dates_full`, `subject`, `credits`, `section`, `class_nbr`, `notes`, `meeting_times_full`. Public SELECT.
  - **`user_schedules`**: user's selected courses + custom events. Cols: `user_id`, `course_id` (nullable), `custom_event_type` (lowercase: `internship` | `recruiting` | `personal`), `custom_title`, `start_time`, `end_time`. RLS: owner-only on all CRUD.
  - **`app_feedback`**: feedback submissions. Cols: `feedback_type`, `message`, `user_email` (nullable). RLS: permissive INSERT for `anon` + `authenticated`; no SELECT/UPDATE/DELETE for users.

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

The app expects the `courses` table in a normalized format (string `dates_full`, text `duration_type`, time-string `start_time`/`end_time`, letter `meeting_days`). Source files from NYU come in different shapes per semester and must be transformed on ingest, never persisted raw.

### Spring source format (currently loaded)
- `dates_full` as a string (e.g., "01/27/2026 - 05/15/2026")
- `duration_type` as text
- Times as time strings
- Half-semester cutoff: **Feb 15** (start date < Feb 15 → 1st Half; > Feb 15 → 2nd Half)

### Fall source format (Fall 2026 file received)
The Fall file has materially different columns than Spring. Transform required before insert.

- **Dates**: Excel serial numbers in `Start Date` / `End Date` / `Mtg Start Date` / `Mtg End Date`. Convert with `excel_serial → datetime(1899,12,30) + timedelta(days=serial)`.
- **Times**: decimal day fractions in `Mtg Start` / `Mtg End` (0.375 = 9:00 AM, 0.5 = 12:00 PM, 0.75 = 6:00 PM). Convert: `hours = fraction * 24`.
- **Meeting days**: `Pat` column, same letter convention as Spring (M T W R F S U; e.g., `MW`, `TR`, `MTWR`).
- **Duration type**: derive from `Session` code, NOT from date math (Session is more reliable):
  - `DFT` (Day Full Term), `EFT` (Evening Full Term) → "Full Semester"
  - `DM1`, `EM1` → "First Half"
  - `DM2`, `EM2` → "Second Half"
  - `INS`, `INW` → "Alternate Schedule" (intensive blocks)
  - `S` and other variants → inspect case by case [VERIFY]
- **Half-semester date cutoff (fallback if Session code is ambiguous)**: ~Oct 22, 2026. Block 1 ends Oct 20-21; Block 2 starts Oct 27 (DM2) or Nov 2 (EM2). Anything ending before Oct 22 is 1st half; starting after is 2nd half.

Fall semester window for reference: Sep 2, 2026 - Dec 14, 2026.

## Key conventions observed

### UI/UX patterns
- Tight, dense layouts: user repeatedly asks to reduce padding/margins (footer `py-2`, calendar cell heights, calendar→footer gap)
- Icon-only action buttons (`h-5 w-5`) paired with stacked text badges in narrow columns
- Two-column flex with **action+badge on left, truncated content on right** to prevent long titles pushing buttons off-screen
- Collapse/expand toggles with chevron icons (Course Finder, Footer)
- Modals over inline forms for secondary actions (auth, add event, feedback, fundraiser)
- Toast notifications for write confirmations
- Semantic color palette is fixed and meaningful: purple=course, blue=internship, orange=recruiting, green=personal

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

- I work in the Claude Code tab in the Claude desktop app. The integrated terminal is the primary interface for git, npm, and shell operations. I do use VS Code on other projects, so it's fine to suggest workflows that involve opening files in VS Code if it genuinely helps. Don't default to it for routine work.
- Claude Code is the only active editing tool for this project. Lovable is the deploy mechanism only (GitHub push → Lovable auto-deploy → live at stern-scheduler.lovable.app). I don't make edits in Lovable's UI anymore. All code, schema, and docs changes go through Claude Code.
- Before any non-trivial change, state the plan in 2-3 bullets and wait for my OK. "Non-trivial" means: touches more than one file, changes a public API, modifies the schema, or alters user-facing behavior. Pure formatting fixes and obvious typos can proceed without confirmation.
- Prefer small atomic commits with clear messages over batched changes. Commit message style: imperative mood, scope-prefixed when natural (e.g., feedback: add rate limit, calendar: shrink cell height).
- When fixing a bug, investigate first (read the code, form a hypothesis), then propose a fix. Don't pattern-match to "looks similar to a bug I've seen" without reading the actual code path.
- Don't add features I didn't ask for, even if they seem like obvious improvements. If you spot something worth doing, mention it and ask, don't ship it silently. Exception: small obvious cleanups directly adjacent to the change you're making (e.g., fixing import order in a file you're already editing).
- When uncertain between two reasonable approaches, present both with tradeoffs rather than picking and proceeding.
- Push to main triggers Lovable redeploy automatically. No staging environment.
- If Lovable's UI ever auto-syncs changes to GitHub that I didn't request, flag it. We may need to disable auto-sync or migrate off Lovable entirely.

## Key files and their roles

- **`src/pages/Index.tsx`**: top-level layout; orchestrates Header, ScheduleCalendar, AlternateSchedulesTable, CourseFinder, Footer, and all modals; owns modal open/close state and the slot-filter state
- **`src/components/scheduler/ScheduleCalendar.tsx`**: `react-big-calendar` wrapper; renders course events + custom events; handles drag/resize and slot click/double-click
- **`src/components/scheduler/CourseFinder.tsx`**: right-side panel; search, filters, course list with add/remove, collapse toggle, time-slot filter chip
- **`src/components/scheduler/AlternateSchedulesTable.tsx`**: conditionally rendered below calendar when alternate-schedule courses are selected
- **`src/hooks/useCourses.ts`**: fetches `courses` table; provides `useFilteredCourses` and `getUniqueSubjects` helpers
- **`src/hooks/useUserSchedule.ts`**: owns all `user_schedules` mutations (toggle course, add/update/delete custom events) + `calculateStats` + `getAlternateScheduleCourses`
- **`src/hooks/useAuth.ts`**: Supabase auth wrapper; sets up `onAuthStateChange` before `getSession`
- **`src/types/scheduler.ts`**: `Course`, `UserSchedule`, `CustomEventType`, `ScheduleStats`, `TimeSlotFilter`, `CalendarEvent`, `EVENT_TYPE_LABELS`, `isAlternateSchedule` helper
- **`src/components/scheduler/FundraiserModal.tsx`**: visit-count localStorage logic + PMC modal
- **`src/components/scheduler/FeedbackModal.tsx`**: feedback form → `app_feedback` insert
- **`src/index.css`**: design tokens (HSL), calendar cell height overrides, semantic colors

### Non-obvious relationships
- `Index.tsx` derives `hasAlternateSchedules` from `useUserSchedule.getAlternateScheduleCourses` and passes it to `ScheduleCalendar` (affects calendar height) AND uses it to conditionally mount `AlternateSchedulesTable`. Both must stay in sync.
- `useUserSchedule.calculateStats` depends on `customEvents` having lowercase `custom_event_type` strings matching DB values. Case mismatch silently zeros out hours.
- `FundraiserModal` mounts unconditionally in `Index.tsx`; its visibility is governed entirely by localStorage on mount (no parent state).

## Open questions

- [VERIFY] Target semester(s): is the courses table loaded per-semester (drop + re-ingest each term) or accumulating across semesters with a `term` column? This affects how the Fall ingest should be structured. REPLY: IT WILL BE PER SEMESTER SO WE CAN SCRAP THE OLD DATA FROM SPRING 2026 or archive it
