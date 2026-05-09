import { useState, useMemo } from "react";
import { Search, Filter, Plus, Minus, ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Course,
  TimeSlotFilter,
  courseMeetsAtTime,
  getDurationType,
  DURATION_TYPE_LABELS,
  DurationType,
  coursesConflict,
  courseConflictsWithEvent,
  isOffCalendar,
  isShortSpan,
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

// Get unique meeting times from courses
function getUniqueMeetingTimes(courses: Course[]): string[] {
  const times = new Set<string>();
  courses.forEach((c) => {
    if (c.meeting_times_full) {
      times.add(c.meeting_times_full);
    }
  });
  return Array.from(times).sort();
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
  const [meetingTimeFilter, setMeetingTimeFilter] = useState<string | null>(null);

  // Get unique credit values and meeting times
  const uniqueCredits = useMemo(() => getUniqueCredits(courses), [courses]);
  const uniqueMeetingTimes = useMemo(() => getUniqueMeetingTimes(courses), [courses]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (subjectFilter && subjectFilter !== "all") count++;
    if (creditsFilter && creditsFilter !== "all") count++;
    if (durationFilter && durationFilter !== "all") count++;
    if (meetingTimeFilter && meetingTimeFilter !== "all") count++;
    if (showSelectedOnly) count++;
    if (hideConflicts) count++;
    return count;
  }, [subjectFilter, creditsFilter, durationFilter, meetingTimeFilter, showSelectedOnly, hideConflicts]);

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

      const matchesMeetingTime = !meetingTimeFilter || meetingTimeFilter === "all" ||
        course.meeting_times_full === meetingTimeFilter;

      const matchesConflict = !hideConflicts || !hasConflict(course);

      return matchesSearch && matchesSubject && matchesSelected && matchesTimeSlot && 
             matchesCredits && matchesDuration && matchesMeetingTime && matchesConflict;
    });
  }, [courses, searchQuery, subjectFilter, showSelectedOnly, selectedCourseIds, 
      timeSlotFilter, creditsFilter, durationFilter, meetingTimeFilter, hideConflicts, selectedCourses, customEvents]);

  // Get duration badge styling
  const getDurationBadgeClass = (durationType: DurationType): string => {
    switch (durationType) {
      case "first_half":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "second_half":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "intensive":
        return "bg-muted text-muted-foreground";
      case "dbi":
        return "bg-violet-200 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200";
      case "full":
      default:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
  };

  // Collapsed state - button aligned to top with arrow icon pointing left (expand direction)
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center h-full bg-card border-l border-border pt-4 px-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleCollapse}
          className="flex items-center gap-1 px-2 py-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground mt-2 [writing-mode:vertical-lr] rotate-180">
          Course Finder
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Compact Header */}
      <div className="p-3 border-b border-border space-y-2">
        {/* Row 1: Title + Collapse */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Course Finder</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Time slot filter indicator */}
        {timeSlotFilter && (
          <div className="flex items-center gap-2 p-1.5 bg-primary/10 rounded-md text-xs">
            <span className="text-primary font-medium">
              Filter: {formatTimeFilter(timeSlotFilter)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearTimeFilter}
              className="h-5 w-5 p-0 ml-auto"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {/* Row 2: Search + Filter Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 h-8 w-8 relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4 max-h-[60vh] overflow-y-auto" align="end">
              <div className="font-medium text-sm">Filters</div>
              
              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Select 
                  value={subjectFilter ?? "all"} 
                  onValueChange={(value) => setSubjectFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full h-8 text-sm">
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

              {/* Credits */}
              <div className="space-y-1.5">
                <Label className="text-xs">Credits</Label>
                <Select 
                  value={creditsFilter ?? "all"} 
                  onValueChange={(value) => setCreditsFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="All Credits" />
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

              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select 
                  value={durationFilter ?? "all"} 
                  onValueChange={(value) => setDurationFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="All Durations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    <SelectItem value="full">Full Semester</SelectItem>
                    <SelectItem value="first_half">1st Half</SelectItem>
                    <SelectItem value="second_half">2nd Half</SelectItem>
                    <SelectItem value="intensive">Intensive</SelectItem>
                    <SelectItem value="dbi">DBi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Meeting Times */}
              <div className="space-y-1.5">
                <Label className="text-xs">Meeting Times</Label>
                <Select 
                  value={meetingTimeFilter ?? "all"} 
                  onValueChange={(value) => setMeetingTimeFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="All Times" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Times</SelectItem>
                    {uniqueMeetingTimes.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="selected-only" className="text-sm">
                    Selected Only
                  </Label>
                  <Switch
                    id="selected-only"
                    checked={showSelectedOnly}
                    onCheckedChange={setShowSelectedOnly}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-conflicts" className="text-sm">
                    Hide Conflicts
                  </Label>
                  <Switch
                    id="hide-conflicts"
                    checked={hideConflicts}
                    onCheckedChange={setHideConflicts}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
              // For off-calendar (Intensive, DBi) or short-span courses, the
              // day-letter prefix implies weekly recurrence which is misleading.
              // Show the date range instead so the actual schedule is clear.
              const showAsDateRange = isOffCalendar(course) || isShortSpan(course);

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
                  className="flex w-full items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  {/* LEFT COLUMN: Actions (Fixed Width) */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {/* Icon-Only Button - h-5 w-5 */}
                    <Button
                      size="icon"
                      variant={isSelected ? "destructive" : "default"}
                      onClick={() => onToggleCourse(course)}
                      className="h-5 w-5 min-h-5 min-w-5"
                    >
                      {isSelected ? (
                        <Minus className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>

                    {/* Badge Stacked Under Button - Two lines for 1st/2nd Half */}
                    <span className={`text-[9px] leading-tight px-1 py-0.5 rounded text-center ${getDurationBadgeClass(durationType)}`}>
                      {durationType === "first_half" ? (
                        <>1st<br/>Half</>
                      ) : durationType === "second_half" ? (
                        <>2nd<br/>Half</>
                      ) : durationType === "intensive" ? (
                        "Int"
                      ) : durationType === "dbi" ? (
                        "DBi"
                      ) : (
                        DURATION_TYPE_LABELS[durationType]
                      )}
                    </span>
                  </div>

                  {/* RIGHT COLUMN: Course Info (Takes remaining space) */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      {course.description ? (
                        <HoverCard openDelay={150} closeDelay={50}>
                          <HoverCardTrigger asChild>
                            <h3 className="font-medium text-sm truncate cursor-help">
                              {course.course_name}
                            </h3>
                          </HoverCardTrigger>
                          <HoverCardContent
                            side="right"
                            align="start"
                            className="w-96 max-h-96 overflow-y-auto text-xs leading-relaxed"
                          >
                            <div className="font-semibold text-sm mb-1.5">{course.course_name}</div>
                            <div>{course.description}</div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <h3 className="font-medium text-sm truncate">{course.course_name}</h3>
                      )}
                      {course.syllabus_url && (
                        <a
                          href={course.syllabus_url}
                          target="_blank"
                          rel="noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                          title="Open syllabus (NYU login required)"
                          aria-label="Open syllabus"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {course.section && (
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        (Section: {course.section})
                      </p>
                    )}
                    {/* Credits | (Days |) Time | (Dates) */}
                    <div className="text-xs text-muted-foreground truncate">
                      {course.credits?.toFixed(1) ?? "0.0"} credits
                      {!showAsDateRange && course.meeting_days && ` | ${course.meeting_days}`}
                      {course.start_time && course.end_time && (
                        <> | {formatTime(course.start_time)} - {formatTime(course.end_time)}</>
                      )}
                      {showAsDateRange && course.dates_full && ` | ${course.dates_full}`}
                    </div>
                    {course.instructor && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {course.instructor}
                      </div>
                    )}
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
