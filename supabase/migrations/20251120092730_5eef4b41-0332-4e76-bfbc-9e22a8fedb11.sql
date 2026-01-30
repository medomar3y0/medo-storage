-- Add new role 'downloader' to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'downloader';

-- Update the handle_new_user function to assign 'downloader' role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    -- Add downloader role by default for all new users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'downloader'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update RLS policies for categories table
DROP POLICY IF EXISTS "Moderators and admins can create categories" ON categories;
DROP POLICY IF EXISTS "Moderators and admins can update categories" ON categories;

CREATE POLICY "Moderators and admins can create categories"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators and admins can update categories"
ON categories
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Update RLS policies for files table
DROP POLICY IF EXISTS "Moderators and admins can upload files" ON files;
DROP POLICY IF EXISTS "Moderators and admins can update files" ON files;

CREATE POLICY "Moderators and admins can upload files"
ON files
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators and admins can update files"
ON files
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));