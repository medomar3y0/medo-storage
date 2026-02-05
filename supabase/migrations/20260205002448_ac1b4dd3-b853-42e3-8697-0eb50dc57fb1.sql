-- Add parent_id column to user_folders for nested folders
ALTER TABLE public.user_folders 
ADD COLUMN parent_id UUID REFERENCES public.user_folders(id) ON DELETE CASCADE;