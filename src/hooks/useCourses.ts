import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Course } from "@/types/scheduler";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("course_name");

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFilteredCourses(
  courses: Course[],
  searchQuery: string,
  subjectFilter: string | null,
  showSelectedOnly: boolean,
  selectedCourseIds: Set<number>
) {
  return courses.filter((course) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      course.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor?.toLowerCase().includes(searchQuery.toLowerCase());

    // Subject filter
    const matchesSubject = !subjectFilter || course.subject === subjectFilter;

    // Selected only filter
    const matchesSelected = !showSelectedOnly || selectedCourseIds.has(course.id);

    return matchesSearch && matchesSubject && matchesSelected;
  });
}

export function getUniqueSubjects(courses: Course[]): string[] {
  const subjects = new Set<string>();
  courses.forEach((course) => {
    if (course.subject) {
      subjects.add(course.subject);
    }
  });
  return Array.from(subjects).sort();
}
