
-- Migration: 20251107111155

-- Migration: 20251103170602
-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Categories policies - everyone can view
CREATE POLICY "Anyone can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

-- Only authenticated users can insert/update/delete categories
CREATE POLICY "Authenticated users can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Files policies - everyone can view
CREATE POLICY "Anyone can view files" 
ON public.files 
FOR SELECT 
USING (true);

-- Only authenticated users can insert/update/delete files
CREATE POLICY "Authenticated users can insert files" 
ON public.files 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update files" 
ON public.files 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete files" 
ON public.files 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', true);

-- Storage policies for files bucket
CREATE POLICY "Anyone can download files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'files');

CREATE POLICY "Authenticated users can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251107104449
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table to store user role assignments
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Allow users to read their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update categories table RLS policies
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Only admins can create categories"
ON public.categories
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update categories"
ON public.categories
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete categories"
ON public.categories
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update files table RLS policies
DROP POLICY IF EXISTS "Anyone can view files" ON public.files;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON public.files;

CREATE POLICY "Anyone can view files"
ON public.files
FOR SELECT
USING (true);

CREATE POLICY "Only admins can upload files"
ON public.files
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update files"
ON public.files
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete files"
ON public.files
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));


-- Migration: 20251107112136
-- إنشاء المستخدم admin@localhost في auth.users مباشرة
-- ملاحظة: هذا مجرد placeholder لأن Supabase يجب أن ينشئ المستخدم عبر API

-- إضافة دور admin للمستخدم الجديد تلقائياً بعد التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- إذا كان البريد الإلكتروني هو medo.mar3y.1@gmail.com، أضف دور admin تلقائياً
  IF NEW.email = 'medo.mar3y.1@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- إنشاء trigger لإضافة دور admin تلقائياً
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_user();

-- Migration: 20251108000811
-- تحديث الـ trigger ليستخدم البريد الإلكتروني الجديد
DROP FUNCTION IF EXISTS public.handle_new_admin_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- إذا كان البريد الإلكتروني هو mohamednasrahmed@outlook.com، أضف دور admin تلقائياً
  IF NEW.email = 'mohamednasrahmed@outlook.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- إعادة إنشاء الـ trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- Migration: 20251108063129
-- Step 1: Add new roles to enum (must be in separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- Migration: 20251108063152
-- Step 2: Update RLS policies for categories table
-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;

-- Create new policies for categories
CREATE POLICY "Moderators and admins can create categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Moderators and admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Update RLS policies for files table
-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can insert files" ON public.files;
DROP POLICY IF EXISTS "Authenticated users can update files" ON public.files;

-- Create new policies for files
CREATE POLICY "Moderators and admins can upload files"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Moderators and admins can update files"
ON public.files
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Migration: 20251108063757
-- Add parent_id column to categories table for subcategories
ALTER TABLE public.categories 
ADD COLUMN parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- Create index for better performance when querying subcategories
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
