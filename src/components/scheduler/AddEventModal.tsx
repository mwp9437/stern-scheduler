import { useState } from "react";
import { format } from "date-fns";
import { CustomEventType } from "@/types/scheduler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    type: "Internship", 
    label: "Internship", 
    icon: <Briefcase className="h-5 w-5" />,
    colorClass: "bg-event-internship text-event-internship-foreground hover:bg-event-internship/80"
  },
  { 
    type: "Recruiting / Study", 
    label: "Recruiting / Study", 
    icon: <BookOpen className="h-5 w-5" />,
    colorClass: "bg-event-recruiting text-event-recruiting-foreground hover:bg-event-recruiting/80"
  },
  { 
    type: "Personal", 
    label: "Personal", 
    icon: <User className="h-5 w-5" />,
    colorClass: "bg-event-personal text-event-personal-foreground hover:bg-event-personal/80"
  },
];

export function AddEventModal({ isOpen, onClose, onAdd, slotStart, slotEnd }: AddEventModalProps) {
  const [title, setTitle] = useState("");
  const [selectedType, setSelectedType] = useState<CustomEventType | null>(null);

  const handleSubmit = () => {
    if (!title || !selectedType || !slotStart || !slotEnd) return;

    onAdd({
      title,
      type: selectedType,
      start: slotStart,
      end: slotEnd,
    });

    setTitle("");
    setSelectedType(null);
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setSelectedType(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Event</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {slotStart && slotEnd && (
            <div className="text-sm text-muted-foreground">
              {format(slotStart, "EEEE, MMM d")} • {format(slotStart, "h:mm a")} - {format(slotEnd, "h:mm a")}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              placeholder="Enter event title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Event Type</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !selectedType}>
            Add Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
