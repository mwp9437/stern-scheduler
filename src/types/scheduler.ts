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
