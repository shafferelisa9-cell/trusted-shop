import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import OrderForm from '@/components/OrderForm';
import { useCart } from '@/contexts/CartContext';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    if (!id) return;
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setProduct(data);
    });
    supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false }).limit(3).then(({ data }) => {
      if (data) setReviews(data);
    });
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-sm opacity-40">Loading...</p>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-muted border border-foreground">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-8">
            <div>
              <h1 className="text-lg font-medium">{product.name}</h1>
              <p className="text-lg font-mono mt-2">{product.price_xmr} XMR</p>
            </div>
            <p className="text-sm leading-relaxed opacity-80">{product.description}</p>

            <button
              onClick={() => addItem(product)}
              className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              ADD TO CART
            </button>

            {/* Reviews */}
            <div className="border-t border-foreground pt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium tracking-widest">
                  REVIEWS {avgRating && <span className="font-mono ml-2">({avgRating} ★)</span>}
                </h2>
                <Link to={`/reviews/${product.id}`} className="text-xs underline hover:opacity-60">
                  All reviews
                </Link>
              </div>
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-sm opacity-40">No reviews yet.</p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="text-sm">
                      <span className="opacity-40">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} — </span>
                      {r.comment}
                    </div>
                  ))
                )}
              </div>
            </div>

            <OrderForm product={product} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
