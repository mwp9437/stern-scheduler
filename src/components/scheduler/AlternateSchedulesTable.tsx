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

interface AlternateSchedulesTableProps {
  courses: Course[];
  defaultOpen?: boolean;
}

export function AlternateSchedulesTable({ courses, defaultOpen = true }: AlternateSchedulesTableProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (courses.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
            <h2 className="text-sm font-semibold">
              Alternate Schedule Courses ({courses.length})
            </h2>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="max-h-[200px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-1.5 text-xs">Course Name</TableHead>
                  <TableHead className="py-1.5 text-xs">Section</TableHead>
                  <TableHead className="py-1.5 text-xs">Instructor</TableHead>
                  <TableHead className="py-1.5 text-xs">Meeting Times</TableHead>
                  <TableHead className="py-1.5 text-xs">Dates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="py-1.5 text-xs font-medium">{course.course_name}</TableCell>
                    <TableCell className="py-1.5 text-xs">{course.section}</TableCell>
                    <TableCell className="py-1.5 text-xs">{course.instructor}</TableCell>
                    <TableCell className="py-1.5 text-xs">{course.meeting_times_full}</TableCell>
                    <TableCell className="py-1.5 text-xs">{course.dates_full}</TableCell>
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