-- Add logo_url column to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS logo_url text;