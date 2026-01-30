-- First, clean up duplicate roles - keep only the most recent role for each user
DELETE FROM public.user_roles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.user_roles
  ORDER BY user_id, created_at DESC
);

-- Add unique constraint on user_id to ensure one role per user
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- Create activity_logs table for tracking all actions
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'upload', 'download', 'delete', 'create_category', 'edit_category', 'delete_category', 'change_role', 'delete_user'
  target_type TEXT, -- 'file', 'category', 'user'
  target_id UUID,
  target_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Only admins can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert their own activity logs
CREATE POLICY "Users can insert their own activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);