
-- Elective positions enum
CREATE TYPE public.elective_position AS ENUM ('governor', 'mp', 'mca', 'woman_rep', 'senator');

-- Submission status enum
CREATE TYPE public.submission_status AS ENUM ('pending', 'verified', 'flagged', 'rejected');

-- Counties table
CREATE TABLE public.counties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Constituencies table
CREATE TABLE public.constituencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, county_id)
);

-- Wards table
CREATE TABLE public.wards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  constituency_id UUID NOT NULL REFERENCES public.constituencies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, constituency_id)
);

-- Polling stations table
CREATE TABLE public.polling_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  ward_id UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  registered_voters INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  party TEXT NOT NULL,
  position public.elective_position NOT NULL,
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  constituency_id UUID REFERENCES public.constituencies(id) ON DELETE SET NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Result submissions table
CREATE TABLE public.result_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polling_station_id UUID NOT NULL REFERENCES public.polling_stations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  position public.elective_position NOT NULL,
  votes INTEGER NOT NULL CHECK (votes >= 0),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.submission_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(polling_station_id, candidate_id)
);

-- Evidence photos table
CREATE TABLE public.evidence_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polling_station_id UUID NOT NULL REFERENCES public.polling_stations(id) ON DELETE CASCADE,
  position public.elective_position NOT NULL,
  photo_url TEXT NOT NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('34A', '34B', '34C')),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_photos ENABLE ROW LEVEL SECURITY;

-- Reference data: readable by all authenticated users
CREATE POLICY "Authenticated users can read counties" ON public.counties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read constituencies" ON public.constituencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read wards" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read polling stations" ON public.polling_stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read candidates" ON public.candidates FOR SELECT TO authenticated USING (true);

-- Result submissions: agents can create, read all, update own
CREATE POLICY "Agents can read all submissions" ON public.result_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agents can create submissions" ON public.result_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Agents can update own submissions" ON public.result_submissions FOR UPDATE TO authenticated USING (auth.uid() = agent_id);

-- Evidence photos: agents can create, read all, delete own
CREATE POLICY "Agents can read all evidence" ON public.evidence_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agents can upload evidence" ON public.evidence_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Agents can delete own evidence" ON public.evidence_photos FOR DELETE TO authenticated USING (auth.uid() = agent_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_result_submissions_updated_at
  BEFORE UPDATE ON public.result_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-photos', 'evidence-photos', true);

CREATE POLICY "Authenticated users can upload evidence photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Anyone can view evidence photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidence-photos');

CREATE POLICY "Users can delete own evidence photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'evidence-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed Kwale County data
INSERT INTO public.counties (id, name, code) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Kwale', '002');

INSERT INTO public.constituencies (id, name, county_id) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Msambweni', 'a1b2c3d4-0001-4000-8000-000000000001'),
  ('b1b2c3d4-0002-4000-8000-000000000001', 'Lunga Lunga', 'a1b2c3d4-0001-4000-8000-000000000001'),
  ('b1b2c3d4-0003-4000-8000-000000000001', 'Matuga', 'a1b2c3d4-0001-4000-8000-000000000001'),
  ('b1b2c3d4-0004-4000-8000-000000000001', 'Kinango', 'a1b2c3d4-0001-4000-8000-000000000001');

-- Msambweni wards
INSERT INTO public.wards (id, name, constituency_id) VALUES
  ('c1b2c3d4-0001-4000-8000-000000000001', 'Gombato Bongwe', 'b1b2c3d4-0001-4000-8000-000000000001'),
  ('c1b2c3d4-0002-4000-8000-000000000001', 'Ukunda', 'b1b2c3d4-0001-4000-8000-000000000001'),
  ('c1b2c3d4-0003-4000-8000-000000000001', 'Kinondo', 'b1b2c3d4-0001-4000-8000-000000000001'),
  ('c1b2c3d4-0004-4000-8000-000000000001', 'Ramisi', 'b1b2c3d4-0001-4000-8000-000000000001');

-- Lunga Lunga wards
INSERT INTO public.wards (id, name, constituency_id) VALUES
  ('c1b2c3d4-0005-4000-8000-000000000001', 'Pongwe/Kikoneni', 'b1b2c3d4-0002-4000-8000-000000000001'),
  ('c1b2c3d4-0006-4000-8000-000000000001', 'Dzombo', 'b1b2c3d4-0002-4000-8000-000000000001'),
  ('c1b2c3d4-0007-4000-8000-000000000001', 'Mwereni', 'b1b2c3d4-0002-4000-8000-000000000001'),
  ('c1b2c3d4-0008-4000-8000-000000000001', 'Vanga', 'b1b2c3d4-0002-4000-8000-000000000001');

-- Matuga wards
INSERT INTO public.wards (id, name, constituency_id) VALUES
  ('c1b2c3d4-0009-4000-8000-000000000001', 'Tsimba Golini', 'b1b2c3d4-0003-4000-8000-000000000001'),
  ('c1b2c3d4-0010-4000-8000-000000000001', 'Waa', 'b1b2c3d4-0003-4000-8000-000000000001'),
  ('c1b2c3d4-0011-4000-8000-000000000001', 'Tiwi', 'b1b2c3d4-0003-4000-8000-000000000001'),
  ('c1b2c3d4-0012-4000-8000-000000000001', 'Kubo South', 'b1b2c3d4-0003-4000-8000-000000000001');

-- Kinango wards
INSERT INTO public.wards (id, name, constituency_id) VALUES
  ('c1b2c3d4-0013-4000-8000-000000000001', 'Ndavaya', 'b1b2c3d4-0004-4000-8000-000000000001'),
  ('c1b2c3d4-0014-4000-8000-000000000001', 'Puma', 'b1b2c3d4-0004-4000-8000-000000000001'),
  ('c1b2c3d4-0015-4000-8000-000000000001', 'Kinango', 'b1b2c3d4-0004-4000-8000-000000000001'),
  ('c1b2c3d4-0016-4000-8000-000000000001', 'Mackinnon Road', 'b1b2c3d4-0004-4000-8000-000000000001'),
  ('c1b2c3d4-0017-4000-8000-000000000001', 'Chengoni/Samburu', 'b1b2c3d4-0004-4000-8000-000000000001'),
  ('c1b2c3d4-0018-4000-8000-000000000001', 'Mwavumbo', 'b1b2c3d4-0004-4000-8000-000000000001'),
  ('c1b2c3d4-0019-4000-8000-000000000001', 'Kasemeni', 'b1b2c3d4-0004-4000-8000-000000000001');
