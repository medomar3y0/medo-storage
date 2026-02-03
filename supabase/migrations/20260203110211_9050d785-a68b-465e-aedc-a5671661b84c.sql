-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- Create a more secure policy - only allow inserts via admin or via database triggers (SECURITY DEFINER functions)
-- The admin policy already covers admin inserts, so we don't need the service policy