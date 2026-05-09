import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type Scenario = Tables<"user_schedule_scenarios">;

type SupabaseError = { code?: string; message?: string };

function isUniqueViolation(error: unknown): boolean {
  return (error as SupabaseError)?.code === "23505";
}

function describeError(error: unknown, fallback: string): string {
  if (isUniqueViolation(error)) {
    return "A scenario with that name already exists.";
  }
  return (error as SupabaseError)?.message ?? fallback;
}

export function useScenarios(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["user_schedule_scenarios", userId],
    queryFn: async (): Promise<Scenario[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_schedule_scenarios")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  const activeScenarioId = scenarios.find((s) => s.is_active)?.id;

  const createScenarioMutation = useMutation({
    mutationFn: async (name: string): Promise<Scenario> => {
      if (!userId) throw new Error("Not authenticated");
      const isFirst = scenarios.length === 0;
      const { data, error } = await supabase
        .from("user_schedule_scenarios")
        .insert({ user_id: userId, name, is_active: isFirst })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedule_scenarios", userId] });
      toast({ title: "Scenario created" });
    },
    onError: (error) => {
      toast({
        title: "Couldn't create scenario",
        description: describeError(error, "Unknown error"),
        variant: "destructive",
      });
    },
  });

  const duplicateScenarioMutation = useMutation({
    mutationFn: async ({
      sourceId,
      newName,
    }: {
      sourceId: string;
      newName: string;
    }): Promise<Scenario> => {
      if (!userId) throw new Error("Not authenticated");

      const { data: newScenario, error: insertError } = await supabase
        .from("user_schedule_scenarios")
        .insert({ user_id: userId, name: newName, is_active: false })
        .select()
        .single();
      if (insertError) throw insertError;

      const { data: sourceRows, error: fetchError } = await supabase
        .from("user_schedules")
        .select("course_id, custom_event_type, custom_title, start_time, end_time")
        .eq("user_id", userId)
        .eq("scenario_id", sourceId);
      if (fetchError) throw fetchError;

      if (sourceRows && sourceRows.length > 0) {
        const clones = sourceRows.map((row) => ({
          ...row,
          user_id: userId,
          scenario_id: newScenario.id,
        }));
        const { error: cloneError } = await supabase.from("user_schedules").insert(clones);
        if (cloneError) throw cloneError;
      }

      return newScenario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedule_scenarios", userId] });
      toast({ title: "Scenario duplicated" });
    },
    onError: (error) => {
      toast({
        title: "Couldn't duplicate scenario",
        description: describeError(error, "Unknown error"),
        variant: "destructive",
      });
    },
  });

  const renameScenarioMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_schedule_scenarios")
        .update({ name: newName })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedule_scenarios", userId] });
      toast({ title: "Scenario renamed" });
    },
    onError: (error) => {
      toast({
        title: "Couldn't rename scenario",
        description: describeError(error, "Unknown error"),
        variant: "destructive",
      });
    },
  });

  // Delete a scenario. FK ON DELETE CASCADE wipes its user_schedules rows.
  // If the deleted scenario was active, promote the most recently created
  // remaining scenario; if none remain, auto-create a fresh "Plan A".
  const deleteScenarioMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Not authenticated");
      const wasActive = scenarios.find((s) => s.id === id)?.is_active ?? false;

      const { error: deleteError } = await supabase
        .from("user_schedule_scenarios")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      if (!wasActive) return;

      const remaining = scenarios.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        const fallback = remaining[remaining.length - 1];
        const { error: activateError } = await supabase
          .from("user_schedule_scenarios")
          .update({ is_active: true })
          .eq("id", fallback.id)
          .eq("user_id", userId);
        if (activateError) throw activateError;
      } else {
        const { error: createError } = await supabase
          .from("user_schedule_scenarios")
          .insert({ user_id: userId, name: "Plan A", is_active: true });
        if (createError) throw createError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedule_scenarios", userId] });
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId] });
      toast({ title: "Scenario deleted" });
    },
    onError: (error) => {
      toast({
        title: "Couldn't delete scenario",
        description: describeError(error, "Unknown error"),
        variant: "destructive",
      });
    },
  });

  // Switch active scenario. Two-step: deactivate the current active row,
  // then activate the target. The partial unique index allows zero active
  // briefly between statements but never two — both a no-active gap and a
  // single-active end state are valid.
  const setActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Not authenticated");

      const { error: deactivateError } = await supabase
        .from("user_schedule_scenarios")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);
      if (deactivateError) throw deactivateError;

      const { error: activateError } = await supabase
        .from("user_schedule_scenarios")
        .update({ is_active: true })
        .eq("id", id)
        .eq("user_id", userId);
      if (activateError) throw activateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_schedule_scenarios", userId] });
      queryClient.invalidateQueries({ queryKey: ["user_schedules", userId] });
    },
    onError: (error) => {
      toast({
        title: "Couldn't switch scenario",
        description: describeError(error, "Unknown error"),
        variant: "destructive",
      });
    },
  });

  const createScenario = useCallback(
    (name: string) => createScenarioMutation.mutateAsync(name),
    [createScenarioMutation],
  );

  const duplicateScenario = useCallback(
    (sourceId: string, newName: string) =>
      duplicateScenarioMutation.mutateAsync({ sourceId, newName }),
    [duplicateScenarioMutation],
  );

  const renameScenario = useCallback(
    (id: string, newName: string) => renameScenarioMutation.mutateAsync({ id, newName }),
    [renameScenarioMutation],
  );

  const deleteScenario = useCallback(
    (id: string) => deleteScenarioMutation.mutateAsync(id),
    [deleteScenarioMutation],
  );

  const setActive = useCallback(
    (id: string) => setActiveMutation.mutateAsync(id),
    [setActiveMutation],
  );

  return {
    scenarios,
    activeScenarioId,
    isLoading,
    createScenario,
    duplicateScenario,
    renameScenario,
    deleteScenario,
    setActive,
  };
}
