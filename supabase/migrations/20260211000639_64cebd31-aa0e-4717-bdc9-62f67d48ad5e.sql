
DROP POLICY "Authenticated users can submit feedback" ON public.app_feedback;

CREATE POLICY "Anyone can submit feedback"
  ON public.app_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
