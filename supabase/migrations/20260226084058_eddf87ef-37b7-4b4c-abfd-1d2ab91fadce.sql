
-- Create SECURITY DEFINER function to get orders by user_id
CREATE OR REPLACE FUNCTION public.get_user_orders(p_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
  FROM (
    SELECT o.id, o.user_id, o.product_id, o.price_xmr, o.created_at,
           o.status, o.tracking_token, o.xmr_address, o.encrypted_details,
           o.sender_public_key,
           json_build_object('name', p.name) as products
    FROM public.orders o
    LEFT JOIN public.products p ON o.product_id = p.id
    WHERE o.user_id = p_user_id
  ) t;
$$;

-- Create SECURITY DEFINER function to get a single order by tracking_token
CREATE OR REPLACE FUNCTION public.get_order_by_token(p_token text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(t)
  FROM (
    SELECT o.id, o.user_id, o.product_id, o.price_xmr, o.created_at,
           o.status, o.tracking_token, o.xmr_address, o.encrypted_details,
           o.sender_public_key,
           row_to_json(p) as products
    FROM public.orders o
    LEFT JOIN public.products p ON o.product_id = p.id
    WHERE o.tracking_token = p_token
    LIMIT 1
  ) t;
$$;

-- Replace the permissive SELECT policy with admin-only
DROP POLICY IF EXISTS "Orders are publicly readable" ON public.orders;

CREATE POLICY "Only admins can read all orders"
  ON public.orders
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
