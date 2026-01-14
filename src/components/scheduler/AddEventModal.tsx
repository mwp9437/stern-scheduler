import { useState, useEffect } from "react";
import { format, setHours, setMinutes, getHours, getMinutes } from "date-fns";
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
  onAdd: (event: { title: string; type: CustomEventType; start: Date; end: Date }) => void;
  onUpdate?: (eventId: string, start: Date, end: Date) => void;
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
      } else if (slotStart && slotEnd) {
        // Add mode - populate from slot selection
        const formatTimeValue = (date: Date) => {
          const h = getHours(date);
          const m = getMinutes(date);
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        };
        setStartTime(formatTimeValue(slotStart));
        setEndTime(formatTimeValue(slotEnd));
        setSelectedType(null);
      }
    }
  }, [slotStart, slotEnd, isOpen, editingEvent]);

  const handleSubmit = () => {
    if (!startTime || !endTime) return;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const baseDate = editingEvent?.start || slotStart;
    if (!baseDate) return;

    const start = setMinutes(setHours(baseDate, startH), startM);
    const end = setMinutes(setHours(baseDate, endH), endM);

    if (isEditMode && editingEvent && onUpdate) {
      // Update existing event
      onUpdate(editingEvent.id, start, end);
    } else if (selectedType) {
      // Add new event
      const title = EVENT_TYPE_LABELS[selectedType];
      onAdd({
        title,
        type: selectedType,
        start,
        end,
      });
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
    onClose();
  };

  const canSubmit = isEditMode 
    ? (startTime && endTime)
    : (selectedType && startTime && endTime);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Custom Block" : "Add Custom Block"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {(slotStart || editingEvent) && (
            <div className="text-sm text-muted-foreground">
              {format(editingEvent?.start || slotStart!, "EEEE, MMM d")}
            </div>
          )}

          {/* Only show type selector in Add mode */}
          {!isEditMode && (
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
          )}

          {/* Show current type in Edit mode */}
          {isEditMode && editingEvent?.resource.eventType && (
            <div className="space-y-2">
              <Label>Block Type</Label>
              <div className="text-sm font-medium text-foreground">
                {EVENT_TYPE_LABELS[editingEvent.resource.eventType]}
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
            {isEditMode ? "Save Changes" : "Add Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
