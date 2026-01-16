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

// Duration type classification
export type DurationType = "full" | "first_half" | "second_half" | "alternate";

export const DURATION_TYPE_LABELS: Record<DurationType, string> = {
  full: "Full",
  first_half: "1st Half",
  second_half: "2nd Half",
  alternate: "Alt",
};

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

export function isAlternateSchedule(course: Course): boolean {
  return course.duration_type === "Alternate Schedule";
}

export function isHalfSemester(course: Course): boolean {
  return course.duration_type?.includes("Half Semester") ?? false;
}

/**
 * Parse dates_full (e.g., "01/22-03/10") to determine semester half
 * Returns: "first_half" if start date < Feb 15, "second_half" otherwise
 */
export function parseDatesFull(datesFull: string | null): { startMonth: number; startDay: number } | null {
  if (!datesFull) return null;
  
  // Expected format: "MM/DD-MM/DD" or "MM/DD - MM/DD"
  const match = datesFull.match(/^(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  
  return {
    startMonth: parseInt(match[1], 10),
    startDay: parseInt(match[2], 10),
  };
}

/**
 * Determine duration type based on duration_type string and dates_full parsing
 */
export function getDurationType(course: Course): DurationType {
  if (isAlternateSchedule(course)) {
    return "alternate";
  }
  
  if (isHalfSemester(course)) {
    const parsedDate = parseDatesFull(course.dates_full);
    if (parsedDate) {
      // Feb 15 = month 2, day 15
      // If start date is before Feb 15, it's first half
      if (parsedDate.startMonth < 2 || (parsedDate.startMonth === 2 && parsedDate.startDay < 15)) {
        return "first_half";
      }
      return "second_half";
    }
    // Fallback if dates can't be parsed
    return "first_half";
  }
  
  return "full";
}

// Check if a course meets at a specific time slot
export function courseMeetsAtTime(course: Course, filter: TimeSlotFilter): boolean {
  const days = parseMeetingDays(course.meeting_days);
  const startTime = parseTime(course.start_time);
  const endTime = parseTime(course.end_time);
  
  if (!days.includes(filter.day) || !startTime || !endTime) return false;
  
  const filterMinutes = filter.hour * 60 + filter.minute;
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  
  // Check if the filter time falls within the course time range
  return filterMinutes >= startMinutes && filterMinutes < endMinutes;
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

/**
 * Check if two courses conflict (same day + overlapping times)
 */
export function coursesConflict(course1: Course, course2: Course): boolean {
  const days1 = parseMeetingDays(course1.meeting_days);
  const days2 = parseMeetingDays(course2.meeting_days);
  
  // Check if any days overlap
  const daysOverlap = days1.some(d => days2.includes(d));
  if (!daysOverlap) return false;
  
  const start1 = parseTime(course1.start_time);
  const end1 = parseTime(course1.end_time);
  const start2 = parseTime(course2.start_time);
  const end2 = parseTime(course2.end_time);
  
  if (!start1 || !end1 || !start2 || !end2) return false;
  
  return timeRangesOverlap(start1, end1, start2, end2);
}

/**
 * Check if a course conflicts with a custom event
 */
export function courseConflictsWithEvent(
  course: Course,
  eventStart: Date,
  eventEnd: Date
): boolean {
  const courseDays = parseMeetingDays(course.meeting_days);
  const eventDay = eventStart.getDay();
  
  if (!courseDays.includes(eventDay)) return false;
  
  const courseStart = parseTime(course.start_time);
  const courseEnd = parseTime(course.end_time);
  
  if (!courseStart || !courseEnd) return false;
  
  const eventStartTime = { hours: eventStart.getHours(), minutes: eventStart.getMinutes() };
  const eventEndTime = { hours: eventEnd.getHours(), minutes: eventEnd.getMinutes() };
  
  return timeRangesOverlap(courseStart, courseEnd, eventStartTime, eventEndTime);
}
