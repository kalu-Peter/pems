
-- ── Public read access for the live results home page ────────────────────
-- The home page is visible to unauthenticated visitors (anon role).
-- Existing SELECT policies are all TO authenticated, so anonymous queries
-- returned empty arrays. These policies grant read access to the tables
-- the home page needs.

-- Result submissions: anon can read all (home page needs verified results
-- AND counts of all statuses for the summary stats cards)
CREATE POLICY "Public can read result submissions"
  ON public.result_submissions FOR SELECT TO anon
  USING (true);

-- Candidates: needed for the !inner join in the results query
CREATE POLICY "Public can read candidates"
  ON public.candidates FOR SELECT TO anon
  USING (true);

-- Polling stations: needed for the !inner join in the results query
CREATE POLICY "Public can read polling stations"
  ON public.polling_stations FOR SELECT TO anon
  USING (true);

-- Reference tables: no sensitive data, safe to expose publicly
CREATE POLICY "Public can read counties"
  ON public.counties FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can read constituencies"
  ON public.constituencies FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can read wards"
  ON public.wards FOR SELECT TO anon
  USING (true);
