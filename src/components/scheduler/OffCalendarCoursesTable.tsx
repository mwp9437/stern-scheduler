import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Course } from "@/types/scheduler";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface OffCalendarCoursesTableProps {
  courses: Course[];
  defaultOpen?: boolean;
}

// Off-calendar courses don't recur weekly — they meet on the specific days
// listed in `dates_full`. The day-letter prefix in `meeting_times_full`
// (e.g. "MSu 9:00 am - 4:00 pm") reads like a recurring pattern, which is
// misleading for a one-weekend intensive. Strip it; the Dates column carries
// the real meeting dates.
function formatOffCalendarTime(meetingTimesFull: string | null): string {
  if (!meetingTimesFull) return "";
  const match = meetingTimesFull.match(/^[A-Za-z]+\s+(.*)$/);
  return match ? match[1] : meetingTimesFull;
}

// Selected courses that don't render on the weekly grid: Intensive (INS/INW)
// and DBi (XTL global immersion trips).
export function OffCalendarCoursesTable({ courses, defaultOpen = true }: OffCalendarCoursesTableProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (courses.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
            <h2 className="text-xs font-semibold">
              Off-Calendar Courses ({courses.length})
            </h2>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
              {isOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="max-h-[220px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-1 text-[11px]">Course Name</TableHead>
                  <TableHead className="py-1 text-[11px]">Type</TableHead>
                  <TableHead className="py-1 text-[11px]">Section</TableHead>
                  <TableHead className="py-1 text-[11px]">Instructor</TableHead>
                  <TableHead className="py-1 text-[11px]">Meeting Times</TableHead>
                  <TableHead className="py-1 text-[11px]">Dates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="py-1 text-[11px] font-medium">{course.course_name}</TableCell>
                    <TableCell className="py-1 text-[11px]">{course.duration_type}</TableCell>
                    <TableCell className="py-1 text-[11px]">{course.section}</TableCell>
                    <TableCell className="py-1 text-[11px]">{course.instructor}</TableCell>
                    <TableCell className="py-1 text-[11px]">{formatOffCalendarTime(course.meeting_times_full)}</TableCell>
                    <TableCell className="py-1 text-[11px]">{course.dates_full}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
