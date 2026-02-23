import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import OrderForm from '@/components/OrderForm';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setProduct(data);
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

            <div className="border-t border-foreground pt-8">
              <h2 className="text-xs font-medium tracking-widest mb-4">REVIEWS</h2>
              <div className="space-y-4">
                {['Great product, fast shipping.', 'Exactly as described.', 'Would order again.'].map((r, i) => (
                  <div key={i} className="text-sm">
                    <span className="opacity-40">Anonymous — </span>
                    {r}
                  </div>
                ))}
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
