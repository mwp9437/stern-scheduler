import { useState } from "react";
import { Search, Filter, Plus, Minus, ChevronLeft, ChevronRight, X } from "lucide-react";
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
import { Course, isAlternateSchedule, TimeSlotFilter, courseMeetsAtTime } from "@/types/scheduler";
import { format } from "date-fns";

interface CourseFinderProps {
  courses: Course[];
  selectedCourseIds: Set<number>;
  subjects: string[];
  onToggleCourse: (course: Course) => void;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  timeSlotFilter: TimeSlotFilter | null;
  onClearTimeFilter: () => void;
}

export function CourseFinder({
  courses,
  selectedCourseIds,
  subjects,
  onToggleCourse,
  isLoading,
  isCollapsed,
  onToggleCollapse,
  timeSlotFilter,
  onClearTimeFilter,
}: CourseFinderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Format time for display
  const formatTimeFilter = (filter: TimeSlotFilter) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hour = filter.hour > 12 ? filter.hour - 12 : filter.hour;
    const ampm = filter.hour >= 12 ? "PM" : "AM";
    const mins = filter.minute.toString().padStart(2, "0");
    return `${dayNames[filter.day]} ${hour}:${mins} ${ampm}`;
  };

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      !searchQuery ||
      course.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = !subjectFilter || subjectFilter === "all" || course.subject === subjectFilter;

    const matchesSelected = !showSelectedOnly || selectedCourseIds.has(course.id);

    const matchesTimeSlot = !timeSlotFilter || courseMeetsAtTime(course, timeSlotFilter);

    return matchesSearch && matchesSubject && matchesSelected && matchesTimeSlot;
  });

  // Collapsed state - just show expand button
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center h-full bg-card border-l border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="flex flex-col items-center gap-2 p-4"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-xs writing-mode-vertical">Course Finder</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Course Finder</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Time slot filter indicator */}
        {timeSlotFilter && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm">
            <span className="text-primary font-medium">
              Filtering by: {formatTimeFilter(timeSlotFilter)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearTimeFilter}
              className="h-6 w-6 p-0 ml-auto"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
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

              // Format time display
              const formatTime = (time: string | null) => {
                if (!time) return "";
                const [h, m] = time.split(":");
                const hour = parseInt(h);
                const ampm = hour >= 12 ? "PM" : "AM";
                const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                return `${hour12}:${m} ${ampm}`;
              };

              return (
                <div
                  key={course.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* Line 1: Course Name + Section */}
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-medium text-sm truncate flex-1 min-w-0">
                          <span className="truncate">{course.course_name}</span>
                          {course.section && (
                            <span className="text-muted-foreground ml-1 shrink-0">
                              ({course.section})
                            </span>
                          )}
                        </h3>
                        {isAltSchedule && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 whitespace-nowrap">
                            Alt
                          </span>
                        )}
                      </div>
                      {/* Line 2: Credits + Meeting Days + Time */}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <span>{course.credits?.toFixed(1) ?? "0.0"} credits</span>
                        {course.meeting_days && (
                          <>
                            <span>|</span>
                            <span>{course.meeting_days}</span>
                          </>
                        )}
                        {course.start_time && course.end_time && (
                          <>
                            <span>|</span>
                            <span>
                              {formatTime(course.start_time)} - {formatTime(course.end_time)}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Instructor on line 3 if present */}
                      {course.instructor && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {course.instructor}
                        </p>
                      )}
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
