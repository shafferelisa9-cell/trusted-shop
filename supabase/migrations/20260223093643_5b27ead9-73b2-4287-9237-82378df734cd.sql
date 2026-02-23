
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_xmr NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '/placeholder.svg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Products are publicly insertable"
  ON public.products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Products are publicly updatable"
  ON public.products FOR UPDATE
  USING (true);

CREATE POLICY "Products are publicly deletable"
  ON public.products FOR DELETE
  USING (true);

-- Users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users are publicly readable"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users are publicly insertable"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  status TEXT NOT NULL DEFAULT 'pending',
  encrypted_details TEXT NOT NULL,
  tracking_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  price_xmr NUMERIC NOT NULL DEFAULT 0,
  xmr_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders are publicly readable"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Orders are publicly insertable"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Orders are publicly updatable"
  ON public.orders FOR UPDATE
  USING (true);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  encrypted_content TEXT NOT NULL,
  sender TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages are publicly readable"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Messages are publicly insertable"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
