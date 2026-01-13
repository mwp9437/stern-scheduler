import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Course, UserSchedule, CustomEventType, ScheduleStats, isAlternateSchedule } from "@/types/scheduler";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes } from "date-fns";

export function useUserSchedule(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user's saved schedule
  const { data: userSchedules = [], isLoading } = useQuery({
    queryKey: ["user_schedules", userId],
    queryFn: async (): Promise<UserSchedule[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_schedules")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
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
      
      const { error } = await supabase
        .from("user_schedules")
        .insert({
          user_id: userId,
          course_id: courseId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId] });
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
      
      const { error } = await supabase
        .from("user_schedules")
        .delete()
        .eq("user_id", userId)
        .eq("course_id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId] });
      toast({ title: "Course removed from schedule" });
    },
    onError: (error) => {
      toast({ title: "Failed to remove course", description: error.message, variant: "destructive" });
    },
  });

  // Add custom event mutation
  const addCustomEventMutation = useMutation({
    mutationFn: async (event: {
      title: string;
      type: CustomEventType;
      start: Date;
      end: Date;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_schedules")
        .insert({
          user_id: userId,
          custom_title: event.title,
          custom_event_type: event.type,
          start_time: event.start.toISOString(),
          end_time: event.end.toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId] });
      toast({ title: "Event added to schedule" });
    },
    onError: (error) => {
      toast({ title: "Failed to add event", description: error.message, variant: "destructive" });
    },
  });

  // Update custom event mutation
  const updateCustomEventMutation = useMutation({
    mutationFn: async (event: {
      id: string;
      start: Date;
      end: Date;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_schedules")
        .update({
          start_time: event.start.toISOString(),
          end_time: event.end.toISOString(),
        })
        .eq("id", event.id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId] });
    },
    onError: (error) => {
      toast({ title: "Failed to update event", description: error.message, variant: "destructive" });
    },
  });

  // Remove custom event mutation
  const removeCustomEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!userId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_schedules")
        .delete()
        .eq("id", eventId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId] });
      toast({ title: "Event removed from schedule" });
    },
    onError: (error) => {
      toast({ title: "Failed to remove event", description: error.message, variant: "destructive" });
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

  // Calculate stats
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
        
        if (event.custom_event_type === "Internship") {
          internshipHours += hours;
        } else if (event.custom_event_type === "Recruiting / Study") {
          recruitingHours += hours;
        }
      }
    });
    
    return { totalCredits, internshipHours, recruitingHours };
  }, [selectedCourseIds, customEvents]);

  // Get alternate schedule courses
  const getAlternateScheduleCourses = useCallback((courses: Course[]) => {
    return courses.filter((c) => selectedCourseIds.has(c.id) && isAlternateSchedule(c));
  }, [selectedCourseIds]);

  return {
    userSchedules,
    selectedCourseIds,
    customEvents,
    isLoading,
    toggleCourse,
    addCustomEvent: addCustomEventMutation.mutate,
    updateCustomEvent: updateCustomEventMutation.mutate,
    removeCustomEvent: removeCustomEventMutation.mutate,
    calculateStats,
    getAlternateScheduleCourses,
  };
}
