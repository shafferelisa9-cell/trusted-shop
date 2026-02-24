-- Add pharmacy-specific fields to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dosage JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS duration JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS effects JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS harm_reduction JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detection_times JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_status JSONB DEFAULT '{}'::jsonb;
