import { useState, useEffect } from "react";
import { format, setHours, setMinutes, getHours, getMinutes } from "date-fns";
import { CustomEventType, EVENT_TYPE_LABELS } from "@/types/scheduler";
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
import { Briefcase, BookOpen, User } from "lucide-react";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: { title: string; type: CustomEventType; start: Date; end: Date }) => void;
  slotStart: Date | null;
  slotEnd: Date | null;
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

export function AddEventModal({ isOpen, onClose, onAdd, slotStart, slotEnd }: AddEventModalProps) {
  const [selectedType, setSelectedType] = useState<CustomEventType | null>(null);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Initialize times when modal opens
  useEffect(() => {
    if (slotStart && slotEnd) {
      const formatTimeValue = (date: Date) => {
        const h = getHours(date);
        const m = getMinutes(date);
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      };
      setStartTime(formatTimeValue(slotStart));
      setEndTime(formatTimeValue(slotEnd));
    }
  }, [slotStart, slotEnd, isOpen]);

  const handleSubmit = () => {
    if (!selectedType || !slotStart || !startTime || !endTime) return;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const start = setMinutes(setHours(slotStart, startH), startM);
    const end = setMinutes(setHours(slotStart, endH), endM);

    // Auto-set title based on type
    const title = EVENT_TYPE_LABELS[selectedType];

    onAdd({
      title,
      type: selectedType,
      start,
      end,
    });

    setSelectedType(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Block</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {slotStart && (
            <div className="text-sm text-muted-foreground">
              {format(slotStart, "EEEE, MMM d")}
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedType || !startTime || !endTime}>
            Add Block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
