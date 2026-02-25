ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quantity_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'pcs';