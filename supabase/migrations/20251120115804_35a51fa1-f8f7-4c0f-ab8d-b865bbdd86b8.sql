-- Add user_email column to activity_logs to store email directly
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS user_email text;