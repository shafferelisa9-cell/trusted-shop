
-- =============================================
-- FIX STORAGE: restrict product-images mutations to admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Only admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Only admins can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Only admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- =============================================
-- RATE LIMITING: orders (max 10 per user per hour)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_order_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.orders
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 orders per hour';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_rate_limit
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_order_rate_limit();

-- =============================================
-- RATE LIMITING: messages (max 30 per order per hour)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.messages
    WHERE order_id = NEW.order_id
      AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 30 messages per hour per order';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER message_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_message_rate_limit();

-- =============================================
-- RATE LIMITING: reviews (one per user per product + max 5/hour)
-- =============================================
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_product_unique UNIQUE (user_id, product_id);

CREATE OR REPLACE FUNCTION public.check_review_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.reviews
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 5 reviews per hour';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER review_rate_limit
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_review_rate_limit();
