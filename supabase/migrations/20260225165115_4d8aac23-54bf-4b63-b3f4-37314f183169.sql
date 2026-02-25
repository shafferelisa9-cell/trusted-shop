
-- Add length constraint on review comments
ALTER TABLE public.reviews ADD CONSTRAINT review_comment_length CHECK (length(comment) <= 2000);

-- Add length constraint on review rating range
ALTER TABLE public.reviews ADD CONSTRAINT review_rating_range CHECK (rating >= 1 AND rating <= 5);
