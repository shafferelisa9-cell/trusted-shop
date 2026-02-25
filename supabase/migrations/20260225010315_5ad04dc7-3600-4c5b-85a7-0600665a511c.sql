
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are publicly readable"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON public.settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));
