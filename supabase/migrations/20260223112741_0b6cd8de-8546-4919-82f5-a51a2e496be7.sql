
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin settings are publicly readable"
ON public.admin_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can insert admin settings"
ON public.admin_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update admin settings"
ON public.admin_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
