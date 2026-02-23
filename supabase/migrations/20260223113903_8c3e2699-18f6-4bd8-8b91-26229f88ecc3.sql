
CREATE POLICY "Users can update their own row"
ON public.users FOR UPDATE
USING (true)
WITH CHECK (true);
