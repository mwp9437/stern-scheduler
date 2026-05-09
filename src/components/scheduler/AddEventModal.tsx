import { useState, useEffect, useMemo } from "react";
import { format, setHours, setMinutes, getHours, getMinutes, addDays } from "date-fns";
import { CustomEventType, EVENT_TYPE_LABELS, CalendarEvent } from "@/types/scheduler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, BookOpen, User, Trash2 } from "lucide-react";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (events: Array<{ title: string; type: CustomEventType; start: Date; end: Date }>) => void;
  onUpdate?: (eventId: string, start: Date, end: Date, eventType?: CustomEventType) => void;
  onDelete?: (eventId: string) => void;
  slotStart: Date | null;
  slotEnd: Date | null;
  editingEvent?: CalendarEvent | null;
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
  editingEvent
}: AddEventModalProps) {
  const [selectedType, setSelectedType] = useState<CustomEventType | null>(null);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());

  const isEditMode = !!editingEvent;

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Custom Block" : "Add Custom Block"}</DialogTitle>
        </DialogHeader>

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

          {/* Type selector - always show in both modes */}
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

        <DialogFooter className="flex gap-2">
          {isEditMode && onDelete && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isEditMode
              ? "Save Changes"
              : selectedDays.size > 1
                ? `Add ${selectedDays.size} Blocks`
                : "Add Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
