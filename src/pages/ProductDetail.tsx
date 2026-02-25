import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import OrderForm from '@/components/OrderForm';
import { useCart } from '@/contexts/CartContext';
import { useXmrRate } from '@/hooks/useXmrRate';
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
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { xmrToUsd } = useXmrRate();

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

  const p = product as any;
  const categories = Array.isArray(p.categories) ? p.categories as string[] : [];
  const galleryImages: string[] = Array.isArray(p.gallery_images) ? p.gallery_images : [];
  const allImages = [product.image_url, ...galleryImages].filter(Boolean);

  const dosage = p.dosage as any;
  const duration = p.duration as any;
  const effects = p.effects as any;
  const harmReduction = Array.isArray(p.harm_reduction) ? p.harm_reduction as string[] : [];
  const detectionTimes = p.detection_times as Record<string, string> | null;
  const interactions = p.interactions as any;
  const legalStatus = p.legal_status as Record<string, string> | null;

  const hasDosage = dosage?.routes && Object.keys(dosage.routes).length > 0;
  const hasDuration = duration?.routes && Object.keys(duration.routes).length > 0;
  const hasEffects = effects && (effects.positive?.length || effects.negative?.length || effects.after_effects?.length);
  const hasDetectionTimes = detectionTimes && Object.keys(detectionTimes).length > 0;
  const hasInteractions = interactions && (interactions.dangerous?.length || interactions.caution?.length || interactions.notes);
  const hasLegalStatus = legalStatus && Object.keys(legalStatus).length > 0;

  const usdPrice = xmrToUsd(product.price_xmr);

  const minQty = p.min_quantity ?? 1;
  const step = p.quantity_step ?? minQty;
  const unitType = p.unit_type ?? 'pcs';
  const perUnitUsd = usdPrice !== null && minQty > 0 ? usdPrice / minQty : null;

  // Initialize quantity to minQty on product load
  if (quantity < minQty) {
    setQuantity(minQty);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Top: Image + Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-2">
            <div className="aspect-square bg-muted border border-foreground">
              <img src={allImages[selectedImage] || product.image_url} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-1 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 border flex-shrink-0 ${selectedImage === i ? 'border-foreground' : 'border-foreground/30'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
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
              <p className="text-lg font-mono mt-2">
                {product.price_xmr} XMR
                {usdPrice !== null && (
                  <span className="text-sm opacity-50 ml-2">~${usdPrice.toFixed(2)}</span>
                )}
              </p>
              {perUnitUsd !== null && minQty > 1 && (
                <p className="text-xs opacity-50 font-mono">
                  from ${perUnitUsd.toFixed(2)} per {unitType}
                </p>
              )}
            </div>
            <p className="text-sm leading-relaxed opacity-80">{product.description}</p>

            {/* Quantity selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs opacity-60">Qty:</span>
              <div className="flex items-center border border-foreground">
                <button
                  onClick={() => setQuantity((q) => Math.max(minQty, q - step))}
                  className="px-3 py-1.5 text-sm hover:bg-foreground hover:text-background transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-1.5 text-sm font-mono border-x border-foreground">
                  {quantity} {unitType}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + step)}
                  className="px-3 py-1.5 text-sm hover:bg-foreground hover:text-background transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={() => addItem(product, quantity)}
              className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              ADD TO CART — {(product.price_xmr * quantity).toFixed(4)} XMR
            </button>

            <OrderForm product={product} />

            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:opacity-60 block">
                More info here
              </a>
            )}
          </div>
        </div>

        {/* Detail Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dosage */}
          {hasDosage && (
            <div className="border border-foreground p-6">
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
            <div className="border border-foreground p-6">
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
            <div className="border border-foreground p-6">
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

          {harmReduction.length > 0 && (
            <div className="border border-foreground p-6">
              <h2 className="text-xs font-medium tracking-widest mb-4">HARM REDUCTION</h2>
              <ul className="space-y-1">
                {harmReduction.map((item, i) => (
                  <li key={i} className="text-xs opacity-80">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {hasDetectionTimes && (
            <div className="border border-foreground p-6">
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

          {hasInteractions && (
            <div className="border border-foreground p-6">
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

          {hasLegalStatus && (
            <div className="border border-foreground p-6">
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
        </div>

        {/* Reviews */}
        <div className="border border-foreground p-6">
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
      </main>
    </div>
  );
};

export default ProductDetail;
