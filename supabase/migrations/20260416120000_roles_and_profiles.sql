
-- User role enum
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'agent');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'agent',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins can read agent profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' AND role = 'agent');

CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (true);

CREATE POLICY "Admins can update agent profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' AND role = 'agent')
  WITH CHECK (role = 'agent');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Counties: super admins can insert/update/delete
CREATE POLICY "Super admins can insert counties"
  ON public.counties FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admins can update counties"
  ON public.counties FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admins can delete counties"
  ON public.counties FOR DELETE TO authenticated
  USING (public.get_my_role() = 'super_admin');

-- Result submissions: admins/super admins can update status (verify/flag/reject)
CREATE POLICY "Admins can update submission status"
  ON public.result_submissions FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (true);

-- Auto-create profile when a user signs up (always defaults to agent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'agent'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- HOW TO CREATE YOUR FIRST SUPER ADMIN:
-- 1. Register an account through the app login page.
-- 2. In the Supabase Dashboard, go to Table Editor → profiles.
-- 3. Find your user row and change the role column to 'super_admin'.
-- OR run this in the Supabase SQL Editor (replace with your email):
--    UPDATE public.profiles
--    SET role = 'super_admin'
--    WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
-- ============================================================
