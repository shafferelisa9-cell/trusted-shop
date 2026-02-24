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

  const categories = Array.isArray(product.categories) ? product.categories as string[] : [];
  const dosage = product.dosage as any;
  const duration = product.duration as any;
  const effects = product.effects as any;
  const harmReduction = Array.isArray(product.harm_reduction) ? product.harm_reduction as string[] : [];
  const detectionTimes = product.detection_times as Record<string, string> | null;
  const interactions = product.interactions as any;
  const legalStatus = product.legal_status as Record<string, string> | null;

  const hasDosage = dosage?.routes && Object.keys(dosage.routes).length > 0;
  const hasDuration = duration?.routes && Object.keys(duration.routes).length > 0;
  const hasEffects = effects && (effects.positive?.length || effects.negative?.length || effects.after_effects?.length);
  const hasDetectionTimes = detectionTimes && Object.keys(detectionTimes).length > 0;
  const hasInteractions = interactions && (interactions.dangerous?.length || interactions.caution?.length || interactions.notes);
  const hasLegalStatus = legalStatus && Object.keys(legalStatus).length > 0;

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
              {categories.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {categories.map((cat, i) => (
                    <span key={i} className="text-[10px] border border-foreground px-2 py-0.5 uppercase tracking-wider">{cat}</span>
                  ))}
                </div>
              )}
              <p className="text-lg font-mono mt-2">{product.price_xmr} XMR</p>
            </div>
            <p className="text-sm leading-relaxed opacity-80">{product.description}</p>

            <button
              onClick={() => addItem(product)}
              className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              ADD TO CART
            </button>

            {/* Dosage */}
            {hasDosage && (
              <div className="border-t border-foreground pt-6">
                <h2 className="text-xs font-medium tracking-widest mb-4">DOSAGE</h2>
                <div className="space-y-4">
                  {Object.entries(dosage.routes as Record<string, Record<string, string>>).map(([route, levels]) => (
                    <div key={route}>
                      <h3 className="text-xs font-medium opacity-60 mb-2">{route}</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(levels).map(([level, dose]) => (
                          <div key={level} className="flex justify-between text-xs">
                            <span className="capitalize opacity-60">{level}</span>
                            <span className="font-mono">{dose}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {dosage.notes && <p className="text-xs opacity-60 italic">{dosage.notes}</p>}
                </div>
              </div>
            )}

            {/* Duration */}
            {hasDuration && (
              <div className="border-t border-foreground pt-6">
                <h2 className="text-xs font-medium tracking-widest mb-4">DURATION</h2>
                <div className="space-y-4">
                  {Object.entries(duration.routes as Record<string, Record<string, string>>).map(([route, timings]) => (
                    <div key={route}>
                      <h3 className="text-xs font-medium opacity-60 mb-2">{route}</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(timings).map(([label, time]) => (
                          <div key={label} className="flex justify-between text-xs">
                            <span className="capitalize opacity-60">{label}</span>
                            <span className="font-mono">{time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {duration.notes && <p className="text-xs opacity-60 italic">{duration.notes}</p>}
                </div>
              </div>
            )}

            {/* Effects */}
            {hasEffects && (
              <div className="border-t border-foreground pt-6">
                <h2 className="text-xs font-medium tracking-widest mb-4">EFFECTS</h2>
                <div className="space-y-4">
                  {effects.positive?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium opacity-60 mb-2">Positive</h3>
                      <ul className="space-y-1">
                        {effects.positive.map((e: string, i: number) => (
                          <li key={i} className="text-xs">+ {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {effects.negative?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium opacity-60 mb-2">Negative</h3>
                      <ul className="space-y-1">
                        {effects.negative.map((e: string, i: number) => (
                          <li key={i} className="text-xs">- {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {effects.after_effects?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium opacity-60 mb-2">After Effects</h3>
                      <ul className="space-y-1">
                        {effects.after_effects.map((e: string, i: number) => (
                          <li key={i} className="text-xs opacity-80">{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Harm Reduction */}
            {harmReduction.length > 0 && (
              <div className="border-t border-foreground pt-6">
                <h2 className="text-xs font-medium tracking-widest mb-4">HARM REDUCTION</h2>
                <ul className="space-y-1">
                  {harmReduction.map((item, i) => (
                    <li key={i} className="text-xs opacity-80">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detection Times */}
            {hasDetectionTimes && (
              <div className="border-t border-foreground pt-6">
                <h2 className="text-xs font-medium tracking-widest mb-4">DETECTION TIMES</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(detectionTimes).map(([method, time]) => (
                    <div key={method} className="flex justify-between text-xs">
                      <span className="capitalize opacity-60">{method}</span>
                      <span className="font-mono">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactions */}
            {hasInteractions && (
              <div className="border-t border-foreground pt-6">
                <h2 className="text-xs font-medium tracking-widest mb-4">INTERACTIONS</h2>
                <div className="space-y-3">
                  {interactions.dangerous?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-destructive mb-1">Dangerous</h3>
                      <ul className="space-y-1">
                        {interactions.dangerous.map((d: string, i: number) => (
                          <li key={i} className="text-xs">{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {interactions.caution?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium opacity-60 mb-1">Caution</h3>
                      <ul className="space-y-1">
                        {interactions.caution.map((c: string, i: number) => (
                          <li key={i} className="text-xs">{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {interactions.notes && <p className="text-xs opacity-60 italic">{interactions.notes}</p>}
                </div>
              </div>
            )}

            {/* Legal Status */}
            {hasLegalStatus && (
              <div className="border-t border-foreground pt-6">
                <h2 className="text-xs font-medium tracking-widest mb-4">LEGAL STATUS</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(legalStatus).map(([country, status]) => (
                    <div key={country} className="flex justify-between text-xs">
                      <span className="opacity-60">{country}</span>
                      <span className="font-mono">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* More Info URL — always at the bottom */}
            {product.url && (
              <div className="border-t border-foreground pt-6">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline hover:opacity-60"
                >
                  More info here
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
