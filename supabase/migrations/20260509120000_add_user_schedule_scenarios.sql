-- Multi-scenario support for user schedules ("Plan A / Plan B").
--
-- Today user_schedules is single-scenario per user. This migration introduces
-- user_schedule_scenarios so each user can keep multiple parallel schedule
-- drafts and switch between them. Existing user_schedules rows are migrated
-- under a single auto-created "Plan A" scenario per user (marked active).
-- After backfill, scenario_id becomes NOT NULL with FK ON DELETE CASCADE so
-- deleting a scenario also wipes all of its courses and custom events.

CREATE TABLE public.user_schedule_scenarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_schedule_scenarios_user_name_unique UNIQUE (user_id, name)
);

-- Exactly one active scenario per user (partial unique index).
CREATE UNIQUE INDEX user_schedule_scenarios_one_active_per_user
  ON public.user_schedule_scenarios (user_id) WHERE is_active;

CREATE INDEX user_schedule_scenarios_user_id_idx
  ON public.user_schedule_scenarios (user_id);

ALTER TABLE public.user_schedule_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scenarios"
  ON public.user_schedule_scenarios FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own scenarios"
  ON public.user_schedule_scenarios FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own scenarios"
  ON public.user_schedule_scenarios FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own scenarios"
  ON public.user_schedule_scenarios FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add nullable scenario_id to user_schedules for backfill.
ALTER TABLE public.user_schedules
  ADD COLUMN scenario_id uuid;

-- Backfill: one "Plan A" scenario per existing user, set active.
INSERT INTO public.user_schedule_scenarios (user_id, name, is_active)
SELECT DISTINCT user_id, 'Plan A', true
FROM public.user_schedules;

UPDATE public.user_schedules us
SET scenario_id = s.id
FROM public.user_schedule_scenarios s
WHERE s.user_id = us.user_id
  AND s.name = 'Plan A';

-- Lock down: NOT NULL + FK with cascade + index for scoped reads.
ALTER TABLE public.user_schedules
  ALTER COLUMN scenario_id SET NOT NULL,
  ADD CONSTRAINT user_schedules_scenario_id_fkey
    FOREIGN KEY (scenario_id) REFERENCES public.user_schedule_scenarios(id) ON DELETE CASCADE;

CREATE INDEX user_schedules_scenario_id_idx
  ON public.user_schedules (scenario_id);
