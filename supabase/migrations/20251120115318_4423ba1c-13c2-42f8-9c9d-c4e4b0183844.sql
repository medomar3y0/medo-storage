-- Fix user_roles unique constraint to allow multiple roles per user and match ON CONFLICT clauses
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);