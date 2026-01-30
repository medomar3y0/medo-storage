-- إضافة عمود username إلى جدول profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- تحديث دالة handle_new_user لحفظ username بدلاً من name
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
  END IF;
  
  RETURN NEW;
END;
$$;