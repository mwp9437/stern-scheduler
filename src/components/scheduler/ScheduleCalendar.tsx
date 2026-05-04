import { useMemo, useCallback, useRef } from "react";
import { Calendar, dateFnsLocalizer, SlotInfo } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, setHours, setMinutes, addDays, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import {
  Course,
  CalendarEvent,
  CustomEventType,
  MeetingPattern,
  parseMeetingDays,
  parseTime,
  isCalendarVisible,
  isHalfSemester,
  EVENT_TYPE_LABELS
} from "@/types/scheduler";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Create drag-and-drop enabled calendar
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

// Custom format for day headers - day name only
const formats = {
  dayFormat: (date: Date) => format(date, "EEE"),
  timeGutterFormat: (date: Date) => {
    const minutes = date.getMinutes();
    // Only show label on the hour
    if (minutes === 0) {
      return format(date, "h a");
    }
    return "";
  },
};

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
  onSlotDoubleClick: (slotInfo: SlotInfo) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onEventDrop?: (eventId: string, start: Date, end: Date) => void;
  onEventResize?: (eventId: string, start: Date, end: Date) => void;
  hasOffCalendarCourses?: boolean;
}

export function ScheduleCalendar({
  courses,
  selectedCourseIds,
  customEvents,
  onSlotSelect,
  onSlotDoubleClick,
  onEventSelect,
  onEventDrop,
  onEventResize,
  hasOffCalendarCourses = false,
}: ScheduleCalendarProps) {
  // Get a fixed week's Monday (use a constant date to avoid "today" highlighting)
  const weekStart = useMemo(() => {
    // Use a fixed reference date to avoid current day highlighting
    const referenceDate = new Date(2024, 0, 8); // A Monday
    return startOfDay(referenceDate);
  }, []);

  // Convert courses and custom events to calendar events
  const events = useMemo((): CalendarEvent[] => {
    const calendarEvents: CalendarEvent[] = [];

    // Add course events. Render only the *primary* (longest) in-person meeting
    // pattern from the flat columns — the ingest already picks the longest pattern.
    // Short auxiliary patterns (intro weeks, one-off make-up sessions) live in
    // `notes` for users who want the full picture; rendering them as separate
    // calendar blocks turned out to be more confusing than useful.
    const showRangeFor = (course: Course): boolean => {
      if (isHalfSemester(course)) return true;
      const raw = course.meeting_patterns as MeetingPattern[] | null | undefined;
      return Array.isArray(raw) && raw.length > 1;
    };

    courses
      .filter((course) => selectedCourseIds.has(course.id) && isCalendarVisible(course))
      .forEach((course) => {
        const days = parseMeetingDays(course.meeting_days);
        const startTime = parseTime(course.start_time);
        const endTime = parseTime(course.end_time);

        if (days.length === 0 || !startTime || !endTime) return;

        const showRange = showRangeFor(course);

        days.forEach((dayIndex) => {
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
              datesInfo: showRange ? course.dates_full ?? undefined : undefined,
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
        case "internship":
          className = "event-internship";
          break;
        case "recruiting":
          className = "event-recruiting";
          break;
        case "personal":
          className = "event-personal";
          break;
      }
    }

    return { className };
  }, []);

  // Custom event component
  const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    if (event.resource.type === "course") {
      const syllabusUrl = event.resource.course?.syllabus_url;
      const description = event.resource.course?.description;
      const inner = (
        <div className="text-xs leading-tight relative">
          {syllabusUrl && (
            <a
              href={syllabusUrl}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 opacity-70 hover:opacity-100"
              title="Open syllabus (NYU login required)"
              aria-label="Open syllabus"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <div className={`font-bold truncate ${syllabusUrl ? "pr-3.5" : ""}`}>{event.title}</div>
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
      if (!description) return inner;
      return (
        <HoverCard openDelay={200} closeDelay={50}>
          <HoverCardTrigger asChild>{inner}</HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            className="w-96 max-h-96 overflow-y-auto text-xs leading-relaxed"
          >
            <div className="font-semibold text-sm mb-1.5">{event.title}</div>
            <div>{description}</div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    return (
      <div className="text-xs leading-tight">
        <div className="font-bold truncate">{event.title}</div>
        <div className="truncate opacity-80">
          {event.resource.eventType ? EVENT_TYPE_LABELS[event.resource.eventType] : ""}
        </div>
      </div>
    );
  }, []);

  // Min and max times for the calendar (8 AM to 10 PM)
  const minTime = useMemo(() => setMinutes(setHours(new Date(), 8), 0), []);
  const maxTime = useMemo(() => setMinutes(setHours(new Date(), 22), 0), []);

  // Use refs to track click timing for double-click detection
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSlotRef = useRef<SlotInfo | null>(null);

  // Handle slot selection - use timeout to differentiate single vs double click
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Check if this is a double-click (same slot within 300ms)
    if (
      lastSlotRef.current &&
      lastSlotRef.current.start.getTime() === slotInfo.start.getTime() &&
      lastSlotRef.current.end.getTime() === slotInfo.end.getTime()
    ) {
      // This is a double-click - open modal
      lastSlotRef.current = null;
      onSlotDoubleClick(slotInfo);
      return;
    }

    // Store this slot and set timeout for single-click behavior
    lastSlotRef.current = slotInfo;
    clickTimeoutRef.current = setTimeout(() => {
      // Single click - filter courses
      onSlotSelect(slotInfo);
      lastSlotRef.current = null;
    }, 300);
  }, [onSlotSelect, onSlotDoubleClick]);

  // Handle event selection (double-click to edit custom events)
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    // Only allow editing custom events
    if (event.resource.type === "custom" && onEventSelect) {
      onEventSelect(event);
    }
  }, [onEventSelect]);

  // Handle drag and drop for custom events
  const handleEventDrop = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    // Only allow dragging custom events
    if (event.resource.type === "custom" && onEventDrop) {
      onEventDrop(event.id, new Date(start), new Date(end));
    }
  }, [onEventDrop]);

  // Handle resize for custom events
  const handleEventResize = useCallback(({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
    // Only allow resizing custom events
    if (event.resource.type === "custom" && onEventResize) {
      onEventResize(event.id, new Date(start), new Date(end));
    }
  }, [onEventResize]);

  // Determine if event is draggable/resizable
  const draggableAccessor = useCallback((event: CalendarEvent) => {
    return event.resource.type === "custom";
  }, []);

  const resizableAccessor = useCallback((event: CalendarEvent) => {
    return event.resource.type === "custom";
  }, []);

  // Custom slot prop getter for hover effect
  const slotPropGetter = useCallback(() => {
    return {
      className: "calendar-slot-hover",
    };
  }, []);

  // Dynamic height: shrink when off-calendar courses are listed below.
  const containerClass = hasOffCalendarCourses
    ? "calendar-container calendar-with-alt"
    : "calendar-container calendar-full";

  return (
    <div className={containerClass}>
      <DnDCalendar
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
        resizable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        draggableAccessor={draggableAccessor}
        resizableAccessor={resizableAccessor}
        eventPropGetter={eventPropGetter}
        slotPropGetter={slotPropGetter}
        formats={formats}
        components={{
          event: EventComponent,
        }}
        dayLayoutAlgorithm="no-overlap"
      />
    </div>
  );
}
