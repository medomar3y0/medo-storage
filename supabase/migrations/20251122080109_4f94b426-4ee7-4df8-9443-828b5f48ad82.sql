-- Fix: Function Search Path Mutable issue
-- Update generate_slug function to have immutable search_path

CREATE OR REPLACE FUNCTION public.generate_slug(text_input text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  slug_output TEXT;
BEGIN
  slug_output := text_input;
  
  -- Replace Arabic characters with English equivalents
  slug_output := REPLACE(slug_output, 'علوم حاسب', 'computer-science');
  slug_output := REPLACE(slug_output, 'إدارة أعمال', 'business-administration');
  slug_output := REPLACE(slug_output, 'تسويق وتجارة إلكترونية', 'marketing-ecommerce');
  slug_output := REPLACE(slug_output, 'نظم معلومات الأعمال', 'business-information-systems');
  slug_output := REPLACE(slug_output, 'محاسبة ومراجعة', 'accounting-auditing');
  
  -- Replace level names
  slug_output := REPLACE(slug_output, 'المستوى الأول', 'level-1');
  slug_output := REPLACE(slug_output, 'المستوى الثاني', 'level-2');
  slug_output := REPLACE(slug_output, 'المستوى الثالث', 'level-3');
  slug_output := REPLACE(slug_output, 'المستوى الرابع', 'level-4');
  slug_output := REPLACE(slug_output, 'المستوى التحضيري', 'preparatory');
  
  -- Replace semester names
  slug_output := REPLACE(slug_output, 'الترم الأول', 'semester-1');
  slug_output := REPLACE(slug_output, 'الترم الثاني', 'semester-2');
  
  -- Convert to lowercase and replace spaces with hyphens
  slug_output := LOWER(slug_output);
  slug_output := REGEXP_REPLACE(slug_output, '[^a-z0-9-]', '-', 'g');
  slug_output := REGEXP_REPLACE(slug_output, '-+', '-', 'g');
  slug_output := TRIM(BOTH '-' FROM slug_output);
  
  RETURN slug_output;
END;
$function$;