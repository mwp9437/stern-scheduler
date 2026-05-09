import { useMemo } from "react";
import { ArrowRightLeft, ExternalLink, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Course,
  UserSchedule,
  coursesConflict,
  courseConflictsWithEvent,
  isCalendarVisible,
} from "@/types/scheduler";

interface CourseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  allCourses: Course[];
  selectedCourseIds: Set<number>;
  customEvents: UserSchedule[];
  onRemove: (courseId: number) => void;
  onSwap: (oldId: number, newId: number) => void;
}

export function CourseDetailModal({
  isOpen,
  onClose,
  course,
  allCourses,
  selectedCourseIds,
  customEvents,
  onRemove,
  onSwap,
}: CourseDetailModalProps) {
  // Sibling sections of the same (subject, catalog), excluding this one.
  const siblingSections = useMemo(() => {
    if (!course) return [];
    return allCourses
      .filter(
        (c) =>
          c.id !== course.id &&
          c.subject === course.subject &&
          c.catalog === course.catalog
      )
      .sort((a, b) => (a.section ?? "").localeCompare(b.section ?? ""));
  }, [allCourses, course]);

  // Other courses (different subject/catalog) that meet at the EXACT same
  // days + times as this one. Useful when exploring alternative classes for
  // a fixed time slot. Off-calendar courses excluded since their schedule
  // doesn't recur weekly.
  const sameTimeAlternatives = useMemo(() => {
    if (!course) return [];
    if (!course.meeting_days || !course.start_time || !course.end_time) return [];
    return allCourses
      .filter((c) => {
        if (c.id === course.id) return false;
        // Already shown in the Swap-section panel above.
        if (c.subject === course.subject && c.catalog === course.catalog) return false;
        if (!isCalendarVisible(c)) return false;
        return (
          c.meeting_days === course.meeting_days &&
          c.start_time === course.start_time &&
          c.end_time === course.end_time
        );
      })
      .sort((a, b) => {
        const aKey = `${a.subject ?? ""} ${a.catalog ?? ""}`;
        const bKey = `${b.subject ?? ""} ${b.catalog ?? ""}`;
        return aKey.localeCompare(bKey);
      });
  }, [allCourses, course]);

  // Detect whether a candidate section would conflict with the user's other
  // selected courses (excluding the one we're swapping FROM) or any custom event.
  const hasConflict = useMemo(() => {
    if (!course) return () => false;
    const otherSelectedCourses = allCourses.filter(
      (c) => selectedCourseIds.has(c.id) && c.id !== course.id
    );
    return (candidate: Course): boolean => {
      if (otherSelectedCourses.some((other) => coursesConflict(candidate, other))) {
        return true;
      }
      return customEvents.some((event) => {
        if (!event.start_time || !event.end_time) return false;
        return courseConflictsWithEvent(
          candidate,
          new Date(event.start_time),
          new Date(event.end_time)
        );
      });
    };
  }, [allCourses, selectedCourseIds, customEvents, course]);

  if (!course) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const handleRemove = () => {
    onRemove(course.id);
    onClose();
  };

  const handleSwap = (newId: number) => {
    onSwap(course.id, newId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2 flex-wrap">
            <span>{course.course_title ?? course.course_name ?? "Untitled Course"}</span>
            {course.section && (
              <span className="text-sm font-normal text-muted-foreground">
                Section {course.section}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {course.subject} {course.catalog}
            {course.instructor && <> · {course.instructor}</>}
            {course.credits != null && <> · {course.credits.toFixed(1)} credits</>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2 -mr-2">
          <div className="space-y-3 text-sm">
            {course.meeting_times_full && (
              <div>
                <span className="text-muted-foreground">Meeting times: </span>
                <span>{course.meeting_times_full}</span>
              </div>
            )}
            {course.dates_full && (
              <div>
                <span className="text-muted-foreground">Dates: </span>
                <span>{course.dates_full}</span>
              </div>
            )}
            {course.syllabus_url && (
              <div>
                <a
                  href={course.syllabus_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open syllabus (NYU login required)
                </a>
              </div>
            )}
            {course.description && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs font-semibold mb-1 text-muted-foreground">
                  Description
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {course.description}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border">
              <div className="text-xs font-semibold mb-2 text-muted-foreground">
                Swap to another section
              </div>
              {siblingSections.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No other sections available.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {siblingSections.map((sibling) => {
                    const conflict =
                      isCalendarVisible(sibling) && hasConflict(sibling);
                    const isAlreadySelected = selectedCourseIds.has(sibling.id);
                    return (
                      <div
                        key={sibling.id}
                        className="flex items-start gap-2 px-2 py-1.5 rounded border border-border hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="font-medium">
                            Section {sibling.section ?? "—"}
                            {sibling.instructor && (
                              <span className="font-normal text-muted-foreground">
                                {" "}· {sibling.instructor}
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {sibling.meeting_times_full ?? "—"}
                            {sibling.dates_full && (
                              <span> · {sibling.dates_full}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {conflict && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Conflict
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isAlreadySelected}
                            onClick={() => handleSwap(sibling.id)}
                            className="h-7 text-xs"
                          >
                            <ArrowRightLeft className="mr-1 h-3 w-3" />
                            {isAlreadySelected ? "Already added" : "Swap"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border">
              <div className="text-xs font-semibold mb-2 text-muted-foreground">
                Other courses at this time
                {sameTimeAlternatives.length > 0 && (
                  <span className="ml-1.5 font-normal">
                    ({sameTimeAlternatives.length})
                  </span>
                )}
              </div>
              {sameTimeAlternatives.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No other courses meet on the same days and times.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sameTimeAlternatives.map((alt) => {
                    const conflict = hasConflict(alt);
                    const isAlreadySelected = selectedCourseIds.has(alt.id);
                    return (
                      <div
                        key={alt.id}
                        className="flex items-start gap-2 px-2 py-1.5 rounded border border-border hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="font-medium truncate">
                            {alt.course_title ?? alt.course_name ?? "Untitled"}
                            <span className="font-normal text-muted-foreground">
                              {" "}· {alt.subject} {alt.catalog}
                              {alt.section && <> · Sec {alt.section}</>}
                            </span>
                          </div>
                          <div className="text-muted-foreground truncate">
                            {alt.instructor ?? "—"}
                            {alt.credits != null && (
                              <span> · {alt.credits.toFixed(1)} cr</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {conflict && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Conflict
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isAlreadySelected}
                            onClick={() => handleSwap(alt.id)}
                            className="h-7 text-xs"
                          >
                            <ArrowRightLeft className="mr-1 h-3 w-3" />
                            {isAlreadySelected ? "Already added" : "Swap"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="destructive" onClick={handleRemove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove from schedule
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
