import { useState, useEffect, useMemo } from "react";
import { format, setHours, setMinutes, getHours, getMinutes, addDays, getDay } from "date-fns";
import {
  Course,
  CustomEventType,
  EVENT_TYPE_LABELS,
  CalendarEvent,
  TimeSlotFilter,
  UserSchedule,
  courseConflictsWithEvent,
  coursesConflict,
  courseMeetsAtTime,
} from "@/types/scheduler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, BookOpen, Plus, Trash2, User } from "lucide-react";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (events: Array<{ title: string; type: CustomEventType; start: Date; end: Date }>) => void;
  onUpdate?: (eventId: string, start: Date, end: Date, eventType?: CustomEventType) => void;
  onDelete?: (eventId: string) => void;
  slotStart: Date | null;
  slotEnd: Date | null;
  editingEvent?: CalendarEvent | null;
  courses?: Course[];
  selectedCourseIds?: Set<number>;
  customEvents?: UserSchedule[];
  onToggleCourse?: (course: Course) => void;
}

const eventTypes: { type: CustomEventType; label: string; icon: React.ReactNode; colorClass: string }[] = [
  {
    type: "internship",
    label: "Internship",
    icon: <Briefcase className="h-5 w-5" />,
    colorClass: "bg-event-internship text-event-internship-foreground hover:bg-event-internship/80"
  },
  {
    type: "recruiting",
    label: "Recruiting / Study",
    icon: <BookOpen className="h-5 w-5" />,
    colorClass: "bg-event-recruiting text-event-recruiting-foreground hover:bg-event-recruiting/80"
  },
  {
    type: "personal",
    label: "Personal",
    icon: <User className="h-5 w-5" />,
    colorClass: "bg-event-personal text-event-personal-foreground hover:bg-event-personal/80"
  },
];

// Day chips in Monday-start order, matching the calendar layout. JS getDay()
// uses Sunday=0, Monday=1, ..., Saturday=6.
const DAY_CHIPS: { value: number; label: string }[] = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "R" },
  { value: 5, label: "F" },
  { value: 6, label: "Sa" },
  { value: 0, label: "Su" },
];

// Map JS getDay() to a 0..6 Monday-start index. Sunday wraps to the end of the
// week so multi-day picks always stay inside the same calendar row.
const dayInMondayWeek = (d: number) => (d === 0 ? 6 : d - 1);

// Generate time options for the dropdown (8 AM to 10 PM in 30-min increments)
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 22 && minute > 0) break; // Stop at 10 PM
      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      const label = `${h}:${minute.toString().padStart(2, "0")} ${ampm}`;
      const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      options.push({ value, label });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

export function AddEventModal({
  isOpen,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  slotStart,
  slotEnd,
  editingEvent,
  courses,
  selectedCourseIds,
  customEvents,
  onToggleCourse,
}: AddEventModalProps) {
  const [selectedType, setSelectedType] = useState<CustomEventType | null>(null);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"custom" | "course">("custom");

  const isEditMode = !!editingEvent;
  const courseTabAvailable =
    !isEditMode && !!slotStart && !!courses && !!onToggleCourse;

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("custom");
      if (editingEvent) {
        // Edit mode - populate from existing event
        setSelectedType(editingEvent.resource.eventType || null);
        const formatTimeValue = (date: Date) => {
          const h = getHours(date);
          const m = getMinutes(date);
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        };
        setStartTime(formatTimeValue(editingEvent.start));
        setEndTime(formatTimeValue(editingEvent.end));
        setSelectedDays(new Set([editingEvent.start.getDay()]));
      } else if (slotStart && slotEnd) {
        // Add mode - populate from slot selection. Pre-select the slot's day.
        const formatTimeValue = (date: Date) => {
          const h = getHours(date);
          const m = getMinutes(date);
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        };
        setStartTime(formatTimeValue(slotStart));
        setEndTime(formatTimeValue(slotEnd));
        setSelectedType(null);
        setSelectedDays(new Set([slotStart.getDay()]));
      }
    }
  }, [slotStart, slotEnd, isOpen, editingEvent]);

  // Courses meeting at the slot's day/time. Off-calendar courses are
  // already excluded by courseMeetsAtTime.
  const slotFilter: TimeSlotFilter | null = useMemo(() => {
    if (!slotStart) return null;
    return {
      day: getDay(slotStart),
      hour: getHours(slotStart),
      minute: getMinutes(slotStart),
    };
  }, [slotStart]);

  const matchingCourses = useMemo(() => {
    if (!slotFilter || !courses) return [];
    return courses.filter((c) => courseMeetsAtTime(c, slotFilter));
  }, [courses, slotFilter]);

  const courseHasConflict = useMemo(() => {
    if (!courses) return () => false;
    const otherSelected = courses.filter((c) => selectedCourseIds?.has(c.id));
    return (candidate: Course): boolean => {
      if (otherSelected.some((other) => other.id !== candidate.id && coursesConflict(candidate, other))) {
        return true;
      }
      if (!customEvents) return false;
      return customEvents.some((event) => {
        if (!event.start_time || !event.end_time) return false;
        return courseConflictsWithEvent(
          candidate,
          new Date(event.start_time),
          new Date(event.end_time),
        );
      });
    };
  }, [courses, selectedCourseIds, customEvents]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const dayChipsLabel = useMemo(() => {
    if (selectedDays.size === 0) return null;
    return DAY_CHIPS.filter((c) => selectedDays.has(c.value))
      .map((c) => c.label)
      .join("");
  }, [selectedDays]);

  const handleSubmit = () => {
    if (!startTime || !endTime) return;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const baseDate = editingEvent?.start || slotStart;
    if (!baseDate) return;

    if (isEditMode && editingEvent && onUpdate) {
      // Edit stays single-day — recompute Dates anchored to the existing date.
      const start = setMinutes(setHours(baseDate, startH), startM);
      const end = setMinutes(setHours(baseDate, endH), endM);
      onUpdate(editingEvent.id, start, end, selectedType || undefined);
    } else if (selectedType && selectedDays.size > 0) {
      // Add mode: emit one event per selected day, all in slotStart's week.
      const baseInWeek = dayInMondayWeek(baseDate.getDay());
      const title = EVENT_TYPE_LABELS[selectedType];
      const events = Array.from(selectedDays).map((targetDay) => {
        const targetInWeek = dayInMondayWeek(targetDay);
        const eventDate = addDays(baseDate, targetInWeek - baseInWeek);
        const start = setMinutes(setHours(eventDate, startH), startM);
        const end = setMinutes(setHours(eventDate, endH), endM);
        return { title, type: selectedType, start, end };
      });
      onAdd(events);
    }

    handleClose();
  };

  const handleDelete = () => {
    if (isEditMode && editingEvent && onDelete) {
      onDelete(editingEvent.id);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setStartTime("");
    setEndTime("");
    setSelectedDays(new Set());
    onClose();
  };

  const canSubmit = isEditMode
    ? !!(startTime && endTime && selectedType)
    : !!(selectedType && startTime && endTime && selectedDays.size > 0);

  const customForm = (
    <div className="space-y-4 py-4">
      {(slotStart || editingEvent) && (
        <div className="text-sm text-muted-foreground">
          {isEditMode
            ? format(editingEvent?.start || slotStart!, "EEEE, MMM d")
            : dayChipsLabel
              ? `Days: ${dayChipsLabel}`
              : "Select at least one day"}
        </div>
      )}

      <div className="space-y-2">
        <Label>Block Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {eventTypes.map((eventType) => (
            <button
              key={eventType.type}
              onClick={() => setSelectedType(eventType.type)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                selectedType === eventType.type
                  ? `${eventType.colorClass} border-primary`
                  : "border-border hover:border-primary/50"
              }`}
            >
              {eventType.icon}
              <span className="text-xs font-medium">{eventType.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!isEditMode && (
        <div className="space-y-2">
          <Label>Days</Label>
          <div className="grid grid-cols-7 gap-1">
            {DAY_CHIPS.map((chip) => {
              const active = selectedDays.has(chip.value);
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => toggleDay(chip.value)}
                  className={`py-1.5 rounded-md border text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-time">Start Time</Label>
          <Select value={startTime} onValueChange={setStartTime}>
            <SelectTrigger id="start-time">
              <SelectValue placeholder="Select start time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-time">End Time</Label>
          <Select value={endTime} onValueChange={setEndTime}>
            <SelectTrigger id="end-time">
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const courseList = (
    <div className="py-4">
      {matchingCourses.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-6 text-center">
          No courses meeting at this time.
        </div>
      ) : (
        <ScrollArea className="max-h-[320px] -mx-2">
          <div className="space-y-1 px-2">
            {matchingCourses.map((c) => {
              const alreadySelected = selectedCourseIds?.has(c.id) ?? false;
              const conflict = !alreadySelected && courseHasConflict(c);
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-2 px-2 py-2 rounded border border-border hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-medium truncate">
                      {c.course_title ?? c.course_name ?? "Untitled"}
                      {c.section && (
                        <span className="text-muted-foreground font-normal">
                          {" "}· Section {c.section}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {c.instructor ?? "—"}
                      {c.meeting_times_full && <> · {c.meeting_times_full}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {conflict && (
                      <Badge variant="destructive" className="text-[10px] py-0">
                        Conflict
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={alreadySelected ? "outline" : "default"}
                      onClick={() => {
                        onToggleCourse?.(c);
                        handleClose();
                      }}
                      className="h-7 text-xs"
                    >
                      {alreadySelected ? (
                        <>
                          <Trash2 className="mr-1 h-3 w-3" />
                          Remove
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Custom Block" : "Add to Schedule"}
          </DialogTitle>
        </DialogHeader>

        {courseTabAvailable ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "custom" | "course")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="custom">Custom Block</TabsTrigger>
              <TabsTrigger value="course">
                Pick a Course
                {matchingCourses.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    ({matchingCourses.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="custom">{customForm}</TabsContent>
            <TabsContent value="course">{courseList}</TabsContent>
          </Tabs>
        ) : (
          customForm
        )}

        <DialogFooter className="flex gap-2">
          {isEditMode && onDelete && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            {activeTab === "course" && courseTabAvailable ? "Close" : "Cancel"}
          </Button>
          {(!courseTabAvailable || activeTab === "custom") && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isEditMode
                ? "Save Changes"
                : selectedDays.size > 1
                  ? `Add ${selectedDays.size} Blocks`
                  : "Add Block"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
