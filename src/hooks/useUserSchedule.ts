import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Course, UserSchedule, CustomEventType, ScheduleStats, isOffCalendar, EVENT_TYPE_LABELS } from "@/types/scheduler";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes } from "date-fns";

export function useUserSchedule(userId: string | undefined, scenarioId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user's saved schedule for the active scenario
  const { data: userSchedules = [], isLoading } = useQuery({
    queryKey: ["user_schedules", userId, scenarioId],
    queryFn: async (): Promise<UserSchedule[]> => {
      if (!userId || !scenarioId) return [];

      const { data, error } = await supabase
        .from("user_schedules")
        .select("*")
        .eq("user_id", userId)
        .eq("scenario_id", scenarioId);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId && !!scenarioId,
  });

  // Get selected course IDs
  const selectedCourseIds = useMemo(() => {
    return new Set(
      userSchedules
        .filter((s) => s.course_id !== null)
        .map((s) => s.course_id as number)
    );
  }, [userSchedules]);

  // Get custom events
  const customEvents = useMemo(() => {
    return userSchedules.filter((s) => s.custom_event_type !== null);
  }, [userSchedules]);

  // Add course mutation
  const addCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      if (!userId) throw new Error("Not authenticated");
      if (!scenarioId) throw new Error("No active scenario");

      const { error } = await supabase
        .from("user_schedules")
        .insert({
          user_id: userId,
          scenario_id: scenarioId,
          course_id: courseId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId, scenarioId] });
      toast({ title: "Course added to schedule" });
    },
    onError: (error) => {
      toast({ title: "Failed to add course", description: error.message, variant: "destructive" });
    },
  });

  // Remove course mutation
  const removeCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      if (!userId) throw new Error("Not authenticated");
      if (!scenarioId) throw new Error("No active scenario");

      const { error } = await supabase
        .from("user_schedules")
        .delete()
        .eq("user_id", userId)
        .eq("scenario_id", scenarioId)
        .eq("course_id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId, scenarioId] });
      toast({ title: "Course removed from schedule" });
    },
    onError: (error) => {
      toast({ title: "Failed to remove course", description: error.message, variant: "destructive" });
    },
  });

  // Add one or more custom events in a single round-trip. Multi-day blocks
  // (e.g. "study MWF 2-4pm") emit one row per chosen day, all in the same
  // INSERT — keeps invalidation and toast count to one.
  const addCustomEventsBatchMutation = useMutation({
    mutationFn: async (
      events: Array<{
        title: string;
        type: CustomEventType;
        start: Date;
        end: Date;
      }>
    ) => {
      if (!userId) throw new Error("Not authenticated");
      if (!scenarioId) throw new Error("No active scenario");
      if (events.length === 0) return;

      const rows = events.map((event) => ({
        user_id: userId,
        scenario_id: scenarioId,
        custom_title: event.title,
        custom_event_type: event.type,
        start_time: event.start.toISOString(),
        end_time: event.end.toISOString(),
      }));

      const { error } = await supabase.from("user_schedules").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, events) => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId, scenarioId] });
      toast({
        title:
          events.length > 1
            ? `${events.length} blocks added to schedule`
            : "Block added to schedule",
      });
    },
    onError: (error) => {
      toast({ title: "Failed to add block", description: error.message, variant: "destructive" });
    },
  });

  // Update custom event mutation (supports updating type as well)
  const updateCustomEventMutation = useMutation({
    mutationFn: async (event: {
      id: string;
      start: Date;
      end: Date;
      eventType?: CustomEventType;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      if (!scenarioId) throw new Error("No active scenario");

      const updateData: Record<string, unknown> = {
        start_time: event.start.toISOString(),
        end_time: event.end.toISOString(),
      };

      // Update type and title if provided
      if (event.eventType) {
        updateData.custom_event_type = event.eventType;
        updateData.custom_title = EVENT_TYPE_LABELS[event.eventType];
      }

      const { error } = await supabase
        .from("user_schedules")
        .update(updateData)
        .eq("id", event.id)
        .eq("user_id", userId)
        .eq("scenario_id", scenarioId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId, scenarioId] });
    },
    onError: (error) => {
      toast({ title: "Failed to update event", description: error.message, variant: "destructive" });
    },
  });

  // Remove custom event mutation
  const removeCustomEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!userId) throw new Error("Not authenticated");
      if (!scenarioId) throw new Error("No active scenario");

      const { error } = await supabase
        .from("user_schedules")
        .delete()
        .eq("id", eventId)
        .eq("user_id", userId)
        .eq("scenario_id", scenarioId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId, scenarioId] });
      toast({ title: "Block removed from schedule" });
    },
    onError: (error) => {
      toast({ title: "Failed to remove block", description: error.message, variant: "destructive" });
    },
  });

  // Swap one course for another (e.g. switching to a different section of the
  // same class). Removes the old row, inserts the new one. The two-step ordering
  // matters when oldId === newId (no-op via toggle) but in practice the caller
  // already filters that case out.
  const swapCourseMutation = useMutation({
    mutationFn: async ({ oldId, newId }: { oldId: number; newId: number }) => {
      if (!userId) throw new Error("Not authenticated");
      if (!scenarioId) throw new Error("No active scenario");

      const { error: deleteError } = await supabase
        .from("user_schedules")
        .delete()
        .eq("user_id", userId)
        .eq("scenario_id", scenarioId)
        .eq("course_id", oldId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_schedules")
        .insert({
          user_id: userId,
          scenario_id: scenarioId,
          course_id: newId,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId, scenarioId] });
      toast({ title: "Section swapped" });
    },
    onError: (error) => {
      toast({ title: "Failed to swap section", description: error.message, variant: "destructive" });
    },
  });

  // Toggle course selection
  const toggleCourse = useCallback((course: Course) => {
    if (selectedCourseIds.has(course.id)) {
      removeCourseMutation.mutate(course.id);
    } else {
      addCourseMutation.mutate(course.id);
    }
  }, [selectedCourseIds, addCourseMutation, removeCourseMutation]);

  // Calculate stats - all formatted to 1 decimal place
  const calculateStats = useCallback((courses: Course[]): ScheduleStats => {
    const selectedCourses = courses.filter((c) => selectedCourseIds.has(c.id));

    const totalCredits = selectedCourses.reduce((sum, c) => sum + (c.credits ?? 0), 0);

    let internshipHours = 0;
    let recruitingHours = 0;

    customEvents.forEach((event) => {
      if (event.start_time && event.end_time) {
        const minutes = differenceInMinutes(
          new Date(event.end_time),
          new Date(event.start_time)
        );
        const hours = minutes / 60;

        // Use lowercase comparison for database values
        if (event.custom_event_type === "internship") {
          internshipHours += hours;
        } else if (event.custom_event_type === "recruiting") {
          recruitingHours += hours;
        }
      }
    });

    // Total Scheduled Load = Credits + Internship Hours + Recruiting Hours
    const totalScheduledLoad = totalCredits + internshipHours + recruitingHours;

    return { totalCredits, internshipHours, recruitingHours, totalScheduledLoad };
  }, [selectedCourseIds, customEvents]);

  // Off-calendar courses: Intensive (INS/INW) + DBi (XTL). These don't
  // render on the weekly grid because their schedule isn't a recurring
  // weekly pattern; they appear in the OffCalendarCoursesTable instead.
  const getOffCalendarCourses = useCallback((courses: Course[]) => {
    return courses.filter((c) => selectedCourseIds.has(c.id) && isOffCalendar(c));
  }, [selectedCourseIds]);

  return {
    userSchedules,
    selectedCourseIds,
    customEvents,
    isLoading,
    toggleCourse,
    swapCourse: swapCourseMutation.mutate,
    addCustomEvents: addCustomEventsBatchMutation.mutate,
    updateCustomEvent: updateCustomEventMutation.mutate,
    removeCustomEvent: removeCustomEventMutation.mutate,
    calculateStats,
    getOffCalendarCourses,
  };
}
