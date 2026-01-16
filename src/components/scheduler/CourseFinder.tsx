import { useState, useMemo } from "react";
import { Search, Filter, Plus, Minus, ChevronLeft, ChevronRight, X, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Course, 
  isAlternateSchedule, 
  TimeSlotFilter, 
  courseMeetsAtTime,
  getDurationType,
  DURATION_TYPE_LABELS,
  DurationType,
  coursesConflict,
  courseConflictsWithEvent
} from "@/types/scheduler";

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
  customEvents?: Array<{
    id: string;
    start_time: string | null;
    end_time: string | null;
  }>;
}

// Get unique credit values from courses
function getUniqueCredits(courses: Course[]): number[] {
  const credits = new Set<number>();
  courses.forEach((c) => {
    if (c.credits !== null && c.credits !== undefined) {
      credits.add(c.credits);
    }
  });
  return Array.from(credits).sort((a, b) => a - b);
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
  customEvents = [],
}: CourseFinderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [hideConflicts, setHideConflicts] = useState(false);
  const [creditsFilter, setCreditsFilter] = useState<string | null>(null);
  const [durationFilter, setDurationFilter] = useState<string | null>(null);

  // Get unique credit values
  const uniqueCredits = useMemo(() => getUniqueCredits(courses), [courses]);

  // Get selected courses for conflict checking
  const selectedCourses = useMemo(() => {
    return courses.filter((c) => selectedCourseIds.has(c.id));
  }, [courses, selectedCourseIds]);

  // Format time for display
  const formatTimeFilter = (filter: TimeSlotFilter) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hour = filter.hour > 12 ? filter.hour - 12 : filter.hour;
    const ampm = filter.hour >= 12 ? "PM" : "AM";
    const mins = filter.minute.toString().padStart(2, "0");
    return `${dayNames[filter.day]} ${hour}:${mins} ${ampm}`;
  };

  // Check if a course has conflicts
  const hasConflict = (course: Course): boolean => {
    // Check against selected courses
    for (const selectedCourse of selectedCourses) {
      if (selectedCourse.id !== course.id && coursesConflict(course, selectedCourse)) {
        return true;
      }
    }
    
    // Check against custom events
    for (const event of customEvents) {
      if (event.start_time && event.end_time) {
        if (courseConflictsWithEvent(course, new Date(event.start_time), new Date(event.end_time))) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        !searchQuery ||
        course.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject = !subjectFilter || subjectFilter === "all" || course.subject === subjectFilter;

      const matchesSelected = !showSelectedOnly || selectedCourseIds.has(course.id);

      const matchesTimeSlot = !timeSlotFilter || courseMeetsAtTime(course, timeSlotFilter);

      const matchesCredits = !creditsFilter || creditsFilter === "all" || 
        course.credits?.toString() === creditsFilter;

      const courseDurationType = getDurationType(course);
      const matchesDuration = !durationFilter || durationFilter === "all" || 
        courseDurationType === durationFilter;

      const matchesConflict = !hideConflicts || !hasConflict(course);

      return matchesSearch && matchesSubject && matchesSelected && matchesTimeSlot && 
             matchesCredits && matchesDuration && matchesConflict;
    });
  }, [courses, searchQuery, subjectFilter, showSelectedOnly, selectedCourseIds, 
      timeSlotFilter, creditsFilter, durationFilter, hideConflicts, selectedCourses, customEvents]);

  // Get duration badge styling
  const getDurationBadgeClass = (durationType: DurationType): string => {
    switch (durationType) {
      case "first_half":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "second_half":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "alternate":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
  };

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
      <div className="p-4 border-b border-border space-y-3">
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

        {/* Filters Row 1: Subject */}
        <div className="flex items-center gap-2">
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

        {/* Filters Row 2: Credits + Duration */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select 
              value={creditsFilter ?? "all"} 
              onValueChange={(value) => setCreditsFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Credits" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Credits</SelectItem>
                {uniqueCredits.map((credit) => (
                  <SelectItem key={credit} value={credit.toString()}>
                    {credit.toFixed(1)} credits
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select 
              value={durationFilter ?? "all"} 
              onValueChange={(value) => setDurationFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Durations</SelectItem>
                <SelectItem value="full">Full Semester</SelectItem>
                <SelectItem value="first_half">1st Half</SelectItem>
                <SelectItem value="second_half">2nd Half</SelectItem>
                <SelectItem value="alternate">Alternate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="selected-only"
              checked={showSelectedOnly}
              onCheckedChange={setShowSelectedOnly}
            />
            <Label htmlFor="selected-only" className="text-sm">
              Selected Only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-conflicts"
              checked={hideConflicts}
              onCheckedChange={setHideConflicts}
            />
            <Label htmlFor="hide-conflicts" className="text-sm flex items-center gap-1">
              <EyeOff className="h-3 w-3" />
              Hide Conflicts
            </Label>
          </div>
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
              const durationType = getDurationType(course);

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
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex w-full justify-between items-center gap-2">
                    {/* Text Container - must have min-w-0 for truncation to work */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* Line 1: Course Name + Section + Badge */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {course.course_name}
                          {course.section && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (Section: {course.section})
                            </span>
                          )}
                        </h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${getDurationBadgeClass(durationType)}`}>
                          {DURATION_TYPE_LABELS[durationType]}
                        </span>
                      </div>
                      {/* Line 2: Credits + Meeting Days + Time */}
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground truncate">
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
                            <span className="truncate">
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
                    {/* Button - flex-shrink-0 ensures it never shrinks */}
                    <Button
                      size="sm"
                      variant={isSelected ? "destructive" : "default"}
                      onClick={() => onToggleCourse(course)}
                      className="flex-shrink-0 ml-2"
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