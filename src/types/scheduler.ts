import { Tables } from "@/integrations/supabase/types";

export type Course = Tables<"courses">;
export type UserSchedule = Tables<"user_schedules">;

// Database stores lowercase values: 'internship', 'recruiting', 'personal'
export type CustomEventType = "internship" | "recruiting" | "personal";

// Display labels for UI
export const EVENT_TYPE_LABELS: Record<CustomEventType, string> = {
  internship: "Internship",
  recruiting: "Recruiting / Study",
  personal: "Personal",
};

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "course" | "custom";
    eventType?: CustomEventType;
    course?: Course;
    instructor?: string;
    datesInfo?: string;
    isHalfSemester?: boolean;
  };
}

export interface ScheduleStats {
  totalCredits: number;
  internshipHours: number;
  recruitingHours: number;
  totalScheduledLoad: number;
}

export interface TimeSlotFilter {
  day: number; // 0-6, Sunday to Saturday
  hour: number;
  minute: number;
}

// Day mapping for meeting_days parsing
export const DAY_MAP: Record<string, number> = {
  Su: 0,
  M: 1,
  T: 2,
  W: 3,
  R: 4,
  F: 5,
  Sa: 6,
};

// Duration type classification — drives badges, calendar visibility, filtering.
export type DurationType =
  | "full"
  | "first_half"
  | "second_half"
  | "intensive"
  | "dbi";

export const DURATION_TYPE_LABELS: Record<DurationType, string> = {
  full: "Full",
  first_half: "1st Half",
  second_half: "2nd Half",
  intensive: "Intensive",
  dbi: "DBi",
};

// One meeting pattern from the source catalog. Multi-pattern classes
// (mostly INS/INW intensives and XTL DBi trips) carry several of these
// in `course.meeting_patterns`. Single-pattern classes carry one entry
// or rely on the flat columns.
export interface MeetingPattern {
  pat_nbr: number;
  meeting_days: string;          // letters: M T W R F Sa Su
  start_time: string | null;     // "HH:MM:SS" — null for async blocks
  end_time: string | null;
  dates_full: string;            // "MM/DD-MM/DD"
  is_async: boolean;             // true when start_time is null
}

export function parseMeetingDays(meetingDays: string | null): number[] {
  if (!meetingDays) return [];

  const days: number[] = [];
  let i = 0;

  while (i < meetingDays.length) {
    // Check for two-character days first (Sa, Su)
    if (i + 1 < meetingDays.length) {
      const twoChar = meetingDays.substring(i, i + 2);
      if (twoChar === "Sa" || twoChar === "Su") {
        days.push(DAY_MAP[twoChar]);
        i += 2;
        continue;
      }
    }

    // Single character day
    const oneChar = meetingDays[i];
    if (DAY_MAP[oneChar] !== undefined) {
      days.push(DAY_MAP[oneChar]);
    }
    i++;
  }

  return days;
}

export function parseTime(timeStr: string | null): { hours: number; minutes: number } | null {
  if (!timeStr) return null;

  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

// "Off-calendar" courses don't render on the weekly grid because their meeting
// schedule doesn't fit a recurring weekly pattern (one-off intensives, DBi trips
// in J-term). They show up in the OffCalendarCoursesTable instead.
export function isOffCalendar(course: Course): boolean {
  return course.duration_type === "Intensive" || course.duration_type === "DBi";
}

export function isCalendarVisible(course: Course): boolean {
  return !isOffCalendar(course);
}

export function isHalfSemester(course: Course): boolean {
  return course.duration_type === "First Half" || course.duration_type === "Second Half";
}

// Direct mapping — duration_type is the source of truth (set by ingest from
// Stern's Session code). No date math.
export function getDurationType(course: Course): DurationType {
  switch (course.duration_type) {
    case "First Half":  return "first_half";
    case "Second Half": return "second_half";
    case "Intensive":   return "intensive";
    case "DBi":         return "dbi";
    case "Full Semester":
    default:            return "full";
  }
}

// Return the patterns to consider for day/time matching. Falls back to a
// synthetic single-pattern derived from the flat columns when meeting_patterns
// is absent, so legacy rows still work.
function getActivePatterns(course: Course): MeetingPattern[] {
  const raw = course.meeting_patterns as MeetingPattern[] | null | undefined;
  if (raw && Array.isArray(raw) && raw.length > 0) {
    return raw.filter((p) => !p.is_async && p.start_time && p.end_time);
  }
  if (course.meeting_days && course.start_time && course.end_time) {
    return [
      {
        pat_nbr: 1,
        meeting_days: course.meeting_days,
        start_time: course.start_time,
        end_time: course.end_time,
        dates_full: course.dates_full ?? "",
        is_async: false,
      },
    ];
  }
  return [];
}

// Check if a course meets at a specific time slot — iterates all in-person
// patterns so multi-pattern classes don't get missed by the slot-click filter.
// Off-calendar courses (Intensive, DBi) are excluded: their dates rarely match
// a recurring weekly slot intent, and including them clutters the slot-filtered
// list with one-off intensives and J-term trips.
export function courseMeetsAtTime(course: Course, filter: TimeSlotFilter): boolean {
  if (isOffCalendar(course)) return false;
  const patterns = getActivePatterns(course);
  const filterMinutes = filter.hour * 60 + filter.minute;

  return patterns.some((p) => {
    const days = parseMeetingDays(p.meeting_days);
    const start = parseTime(p.start_time);
    const end = parseTime(p.end_time);
    if (!days.includes(filter.day) || !start || !end) return false;

    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    return filterMinutes >= startMinutes && filterMinutes < endMinutes;
  });
}

/**
 * Check if two time ranges overlap
 * Strict overlap: (StartA < EndB) AND (EndA > StartB)
 */
export function timeRangesOverlap(
  start1: { hours: number; minutes: number },
  end1: { hours: number; minutes: number },
  start2: { hours: number; minutes: number },
  end2: { hours: number; minutes: number }
): boolean {
  const start1Minutes = start1.hours * 60 + start1.minutes;
  const end1Minutes = end1.hours * 60 + end1.minutes;
  const start2Minutes = start2.hours * 60 + start2.minutes;
  const end2Minutes = end2.hours * 60 + end2.minutes;

  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
}

// Cross-pattern conflict: any in-person pattern of course1 overlapping any
// in-person pattern of course2 on a shared day.
export function coursesConflict(course1: Course, course2: Course): boolean {
  const patterns1 = getActivePatterns(course1);
  const patterns2 = getActivePatterns(course2);

  for (const p1 of patterns1) {
    const days1 = parseMeetingDays(p1.meeting_days);
    const start1 = parseTime(p1.start_time);
    const end1 = parseTime(p1.end_time);
    if (!start1 || !end1) continue;

    for (const p2 of patterns2) {
      const days2 = parseMeetingDays(p2.meeting_days);
      if (!days1.some((d) => days2.includes(d))) continue;

      const start2 = parseTime(p2.start_time);
      const end2 = parseTime(p2.end_time);
      if (!start2 || !end2) continue;

      if (timeRangesOverlap(start1, end1, start2, end2)) return true;
    }
  }

  return false;
}

// A course conflicts with a custom event if any in-person pattern overlaps.
export function courseConflictsWithEvent(
  course: Course,
  eventStart: Date,
  eventEnd: Date
): boolean {
  const patterns = getActivePatterns(course);
  const eventDay = eventStart.getDay();
  const eventStartTime = { hours: eventStart.getHours(), minutes: eventStart.getMinutes() };
  const eventEndTime = { hours: eventEnd.getHours(), minutes: eventEnd.getMinutes() };

  return patterns.some((p) => {
    const days = parseMeetingDays(p.meeting_days);
    if (!days.includes(eventDay)) return false;

    const start = parseTime(p.start_time);
    const end = parseTime(p.end_time);
    if (!start || !end) return false;

    return timeRangesOverlap(start, end, eventStartTime, eventEndTime);
  });
}
