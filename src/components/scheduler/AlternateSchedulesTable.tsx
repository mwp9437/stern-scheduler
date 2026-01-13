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
    <div className="border-t border-border bg-card px-6 py-4">
      <h2 className="text-lg font-semibold mb-3">Alternate Schedule Courses</h2>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Course Name</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Meeting Times</TableHead>
              <TableHead>Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.course_name}</TableCell>
                <TableCell>{course.section}</TableCell>
                <TableCell>{course.instructor}</TableCell>
                <TableCell>{course.meeting_times_full}</TableCell>
                <TableCell>{course.dates_full}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
