import { useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, SlotInfo, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, setHours, setMinutes, addDays, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { 
  Course, 
  CalendarEvent, 
  CustomEventType, 
  parseMeetingDays, 
  parseTime, 
  isAlternateSchedule,
  isHalfSemester 
} from "@/types/scheduler";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface ScheduleCalendarProps {
  courses: Course[];
  selectedCourseIds: Set<number>;
  customEvents: Array<{
    id: string;
    custom_title: string | null;
    custom_event_type: string | null;
    start_time: string | null;
    end_time: string | null;
  }>;
  onSlotSelect: (slotInfo: SlotInfo) => void;
  onEventResize?: (event: CalendarEvent, start: Date, end: Date) => void;
}

export function ScheduleCalendar({
  courses,
  selectedCourseIds,
  customEvents,
  onSlotSelect,
  onEventResize,
}: ScheduleCalendarProps) {
  // Get the current week's Monday
  const weekStart = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return startOfDay(new Date(today.setDate(diff)));
  }, []);

  // Convert courses and custom events to calendar events
  const events = useMemo((): CalendarEvent[] => {
    const calendarEvents: CalendarEvent[] = [];

    // Add course events
    courses
      .filter((course) => selectedCourseIds.has(course.id) && !isAlternateSchedule(course))
      .forEach((course) => {
        const days = parseMeetingDays(course.meeting_days);
        const startTime = parseTime(course.start_time);
        const endTime = parseTime(course.end_time);

        if (days.length === 0 || !startTime || !endTime) return;

        days.forEach((dayIndex) => {
          // Calculate the date for this day of the week (Mon=1, Tue=2, etc.)
          const eventDate = addDays(weekStart, dayIndex - 1);
          
          const start = setMinutes(setHours(eventDate, startTime.hours), startTime.minutes);
          const end = setMinutes(setHours(eventDate, endTime.hours), endTime.minutes);

          calendarEvents.push({
            id: `course-${course.id}-${dayIndex}`,
            title: course.course_name ?? "Untitled Course",
            start,
            end,
            resource: {
              type: "course",
              course,
              instructor: course.instructor ?? undefined,
              datesInfo: isHalfSemester(course) ? course.dates_full ?? undefined : undefined,
              isHalfSemester: isHalfSemester(course),
            },
          });
        });
      });

    // Add custom events
    customEvents.forEach((event) => {
      if (!event.start_time || !event.end_time) return;

      calendarEvents.push({
        id: event.id,
        title: event.custom_title ?? "Custom Event",
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        resource: {
          type: "custom",
          eventType: event.custom_event_type as CustomEventType,
        },
      });
    });

    return calendarEvents;
  }, [courses, selectedCourseIds, customEvents, weekStart]);

  // Custom event styling
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    let className = "event-course";
    
    if (event.resource.type === "custom") {
      switch (event.resource.eventType) {
        case "Internship":
          className = "event-internship";
          break;
        case "Recruiting / Study":
          className = "event-recruiting";
          break;
        case "Personal":
          className = "event-personal";
          break;
      }
    }

    return { className };
  }, []);

  // Custom event component
  const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    if (event.resource.type === "course") {
      return (
        <div className="text-xs leading-tight">
          <div className="font-bold truncate">{event.title}</div>
          {event.resource.instructor && (
            <div className="truncate opacity-80">{event.resource.instructor}</div>
          )}
          {event.resource.isHalfSemester && event.resource.datesInfo && (
            <div className="truncate text-[10px] opacity-70 mt-0.5">
              {event.resource.datesInfo}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-xs leading-tight">
        <div className="font-bold truncate">{event.title}</div>
        <div className="truncate opacity-80">{event.resource.eventType}</div>
      </div>
    );
  }, []);

  // Min and max times for the calendar (8 AM to 10 PM)
  const minTime = useMemo(() => setMinutes(setHours(new Date(), 8), 0), []);
  const maxTime = useMemo(() => setMinutes(setHours(new Date(), 22), 0), []);

  return (
    <div className="h-full">
      <Calendar<CalendarEvent>
        localizer={localizer}
        events={events}
        defaultView="week"
        views={["week"]}
        step={30}
        timeslots={1}
        min={minTime}
        max={maxTime}
        date={weekStart}
        onNavigate={() => {}} // Disable navigation
        toolbar={false}
        selectable
        onSelectSlot={onSlotSelect}
        eventPropGetter={eventPropGetter}
        components={{
          event: EventComponent,
        }}
        dayLayoutAlgorithm="no-overlap"
      />
    </div>
  );
}
