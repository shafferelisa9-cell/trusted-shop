
-- 1. Drop the foreign key constraint on messages.order_id
ALTER TABLE public.messages DROP CONSTRAINT messages_order_id_fkey;

-- 2. Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- 3. RLS: anyone can read product images
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 4. RLS: authenticated users can upload product images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 5. RLS: authenticated users can update product images
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 6. RLS: authenticated users can delete product images
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
