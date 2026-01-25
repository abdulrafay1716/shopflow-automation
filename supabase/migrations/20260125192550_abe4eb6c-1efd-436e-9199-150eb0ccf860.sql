-- Add automation time settings columns to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS automation_start_hour integer DEFAULT 11,
ADD COLUMN IF NOT EXISTS automation_end_hour integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS automation_timezone text DEFAULT 'Asia/Karachi';