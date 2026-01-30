-- Drop old tables that we don't need anymore
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.semesters CASCADE;
DROP TABLE IF EXISTS public.academic_levels CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;

-- Create user_folders table for organizing files
CREATE TABLE public.user_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_files table with share functionality
CREATE TABLE public.user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.user_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  file_extension TEXT,
  share_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for share_code lookups
CREATE INDEX idx_user_files_share_code ON public.user_files(share_code);
CREATE INDEX idx_user_files_user_id ON public.user_files(user_id);
CREATE INDEX idx_user_folders_user_id ON public.user_folders(user_id);

-- Enable RLS
ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_folders
CREATE POLICY "Users can view their own folders"
ON public.user_folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
ON public.user_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.user_folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.user_folders FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all folders"
ON public.user_folders FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_files
CREATE POLICY "Users can view their own files"
ON public.user_files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own files"
ON public.user_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
ON public.user_files FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
ON public.user_files FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all files"
ON public.user_files FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view public files by share_code"
ON public.user_files FOR SELECT
USING (is_public = true AND share_code IS NOT NULL);

-- Trigger for updating timestamps
CREATE TRIGGER update_user_folders_updated_at
BEFORE UPDATE ON public.user_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_files_updated_at
BEFORE UPDATE ON public.user_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique share code
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update handle_new_user to give users proper role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with username
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  
  -- Add admin role if email matches
  IF NEW.email = 'mohamednasrahmed@outlook.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Add user role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;