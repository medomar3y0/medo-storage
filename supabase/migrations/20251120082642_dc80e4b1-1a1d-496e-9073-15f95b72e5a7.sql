-- Add slug column to departments table
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add slug column to academic_levels table
ALTER TABLE public.academic_levels ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add slug column to semesters table
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add slug column to categories table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create function to generate slug from Arabic text
CREATE OR REPLACE FUNCTION public.generate_slug(text_input TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Update existing departments with slugs
UPDATE public.departments 
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Update existing academic_levels with slugs based on level_number and department
UPDATE public.academic_levels al
SET slug = (
  SELECT d.slug || '-' || 
    CASE 
      WHEN al.level_number = 0 THEN 'preparatory'
      ELSE 'level-' || al.level_number::TEXT
    END
  FROM public.departments d
  WHERE d.id = al.department_id
)
WHERE al.slug IS NULL;

-- Update existing semesters with slugs
UPDATE public.semesters s
SET slug = (
  SELECT al.slug || '-semester-' || s.semester_number::TEXT
  FROM public.academic_levels al
  WHERE al.id = s.academic_level_id
)
WHERE s.slug IS NULL;

-- Update existing categories with slugs
UPDATE public.categories c
SET slug = (
  SELECT s.slug || '-' || LOWER(REGEXP_REPLACE(c.name, '[^a-zA-Z0-9]', '-', 'g'))
  FROM public.semesters s
  WHERE s.id = c.semester_id
)
WHERE c.slug IS NULL AND c.semester_id IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_slug ON public.departments(slug);
CREATE INDEX IF NOT EXISTS idx_academic_levels_slug ON public.academic_levels(slug);
CREATE INDEX IF NOT EXISTS idx_semesters_slug ON public.semesters(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- Make slug NOT NULL after populating
ALTER TABLE public.departments ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.academic_levels ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.semesters ALTER COLUMN slug SET NOT NULL;