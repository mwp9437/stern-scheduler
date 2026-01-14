import { Course } from "@/types/scheduler";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AlternateSchedulesTableProps {
  courses: Course[];
}

export function AlternateSchedulesTable({ courses }: AlternateSchedulesTableProps) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="border border-border bg-card rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/50">
        <h2 className="text-sm font-semibold">Alternate Schedule Courses</h2>
      </div>
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
    </div>
  );
}
