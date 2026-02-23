import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <Link
      to={`/product/${product.id}`}
      className="border border-foreground block hover:opacity-80 transition-opacity"
    >
      <div className="aspect-square bg-muted flex items-center justify-center">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4 border-t border-foreground">
        <h2 className="text-sm font-medium">{product.name}</h2>
        <p className="text-sm font-mono mt-1">{product.price_xmr} XMR</p>
      </div>
    </Link>
  );
};

export default ProductCard;
