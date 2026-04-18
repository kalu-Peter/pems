
-- Add polling station assignment to profiles (one agent per station)
ALTER TABLE public.profiles
  ADD COLUMN polling_station_id UUID REFERENCES public.polling_stations(id) ON DELETE SET NULL;

-- Enforce: only one agent per polling station (NULLs are excluded from uniqueness)
CREATE UNIQUE INDEX profiles_polling_station_unique
  ON public.profiles(polling_station_id)
  WHERE polling_station_id IS NOT NULL;

-- ── Constituencies ────────────────────────────────────────────────────────
CREATE POLICY "Admins can insert constituencies"
  ON public.constituencies FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can update constituencies"
  ON public.constituencies FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can delete constituencies"
  ON public.constituencies FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

-- ── Wards ─────────────────────────────────────────────────────────────────
CREATE POLICY "Admins can insert wards"
  ON public.wards FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can update wards"
  ON public.wards FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can delete wards"
  ON public.wards FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

-- ── Polling Stations ──────────────────────────────────────────────────────
CREATE POLICY "Admins can insert polling stations"
  ON public.polling_stations FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can update polling stations"
  ON public.polling_stations FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins can delete polling stations"
  ON public.polling_stations FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'));
