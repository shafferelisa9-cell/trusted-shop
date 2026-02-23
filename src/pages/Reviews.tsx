import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { getUserId } from '@/lib/cookies';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

const Reviews = () => {
  const { id } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [productName, setProductName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('products').select('name').eq('id', id).single().then(({ data }) => {
      if (data) setProductName(data.name);
    });
    fetchReviews();
  }, [id]);

  const fetchReviews = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getUserId();
    if (!userId || !id) return;
    setSubmitting(true);
    await supabase.from('reviews').insert({
      product_id: id,
      user_id: userId,
      rating,
      comment,
    });
    setComment('');
    setRating(5);
    setSubmitting(false);
    fetchReviews();
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-sm font-medium tracking-widest">REVIEWS</h1>
          <p className="text-sm opacity-60 mt-1">{productName}</p>
          <p className="text-sm mt-2">
            Average: <span className="font-mono">{avgRating}</span> / 5 — {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="border border-foreground p-6 space-y-4">
          <h2 className="text-xs font-medium tracking-widest">LEAVE A REVIEW</h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-lg ${star <= rating ? 'opacity-100' : 'opacity-20'} transition-opacity`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-foreground bg-background p-3 text-sm resize-none h-20 focus:outline-none"
            placeholder="Your review..."
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="border border-foreground px-6 py-2 text-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
          </button>
        </form>

        <div className="space-y-px border border-foreground">
          {reviews.length === 0 ? (
            <p className="text-sm opacity-40 p-4">No reviews yet. Be the first!</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="p-4 border-b border-foreground last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <span className="text-xs opacity-40">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm mt-1 opacity-80">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Reviews;
