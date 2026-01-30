-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create profiles table with optional name field
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Update the handle_new_user function to support both admin and profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  
  -- Add admin role if email matches
  IF NEW.email = 'mohamednasrahmed@outlook.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  years_count integer NOT NULL,
  has_preparatory boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view departments"
  ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage departments"
  ON public.departments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create academic levels table
CREATE TABLE IF NOT EXISTS public.academic_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  level_number integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(department_id, level_number)
);

ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view academic levels"
  ON public.academic_levels FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage academic levels"
  ON public.academic_levels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create semesters table
CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_level_id uuid REFERENCES public.academic_levels(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  semester_number integer NOT NULL CHECK (semester_number IN (1, 2)),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(academic_level_id, semester_number)
);

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view semesters"
  ON public.semesters FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage semesters"
  ON public.semesters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update categories table to link to semesters
ALTER TABLE public.categories 
  DROP COLUMN IF EXISTS parent_id,
  ADD COLUMN IF NOT EXISTS semester_id uuid REFERENCES public.semesters(id) ON DELETE CASCADE;

-- Insert default departments
INSERT INTO public.departments (name, years_count, has_preparatory) VALUES
  ('هندسة', 4, true),
  ('علوم حاسب', 4, false),
  ('تسويق وتجارة إلكترونية', 4, false),
  ('نظم معلومات الأعمال', 4, false),
  ('محاسبة ومراجعة', 4, false),
  ('إدارة أعمال', 4, false)
ON CONFLICT (name) DO NOTHING;