
-- ── Candidate management for admins ──────────────────────────────────────
CREATE POLICY "Admins can insert candidates"
  ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can update candidates"
  ON public.candidates FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can delete candidates"
  ON public.candidates FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

-- ── Numeric summary fields on evidence photos ────────────────────────────
-- Captures Form 34A/34B/34C summary totals alongside the photo
ALTER TABLE public.evidence_photos
  ADD COLUMN total_valid_votes INTEGER,
  ADD COLUMN rejected_votes    INTEGER;
