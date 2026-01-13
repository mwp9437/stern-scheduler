import { useState } from "react";
import { Search, Filter, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Course, isAlternateSchedule } from "@/types/scheduler";

interface CourseFinderProps {
  courses: Course[];
  selectedCourseIds: Set<number>;
  subjects: string[];
  onToggleCourse: (course: Course) => void;
  isLoading: boolean;
}

export function CourseFinder({
  courses,
  selectedCourseIds,
  subjects,
  onToggleCourse,
  isLoading,
}: CourseFinderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      !searchQuery ||
      course.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = !subjectFilter || subjectFilter === "all" || course.subject === subjectFilter;

    const matchesSelected = !showSelectedOnly || selectedCourseIds.has(course.id);

    return matchesSearch && matchesSubject && matchesSelected;
  });

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        <h2 className="text-lg font-semibold">Course Finder</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by course or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select 
              value={subjectFilter ?? "all"} 
              onValueChange={(value) => setSubjectFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="selected-only"
            checked={showSelectedOnly}
            onCheckedChange={setShowSelectedOnly}
          />
          <Label htmlFor="selected-only" className="text-sm">
            Show Selected Only
          </Label>
        </div>
      </div>

      {/* Course List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No courses found
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCourses.map((course) => {
              const isSelected = selectedCourseIds.has(course.id);
              const isAltSchedule = isAlternateSchedule(course);

              return (
                <div
                  key={course.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">
                          {course.course_name}
                        </h3>
                        {isAltSchedule && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Alt Schedule
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {course.instructor}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{course.credits} credits</span>
                        <span>{course.meeting_days}</span>
                        {course.start_time && course.end_time && (
                          <span>
                            {course.start_time?.slice(0, 5)} - {course.end_time?.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isSelected ? "destructive" : "default"}
                      onClick={() => onToggleCourse(course)}
                      className="shrink-0"
                    >
                      {isSelected ? (
                        <>
                          <Minus className="h-3 w-3 mr-1" />
                          Remove
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
