-- Add share_code column to user_folders for folder sharing
ALTER TABLE public.user_folders 
ADD COLUMN share_code TEXT UNIQUE DEFAULT NULL;

-- Add is_public column to user_folders
ALTER TABLE public.user_folders 
ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Create index for share_code lookups
CREATE INDEX idx_user_folders_share_code ON public.user_folders(share_code) WHERE share_code IS NOT NULL;

-- Allow anyone to view public folders by share_code
CREATE POLICY "Anyone can view public folders by share_code" 
ON public.user_folders 
FOR SELECT 
USING (is_public = true AND share_code IS NOT NULL);