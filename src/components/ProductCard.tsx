import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCart();

  return (
    <div className="border border-foreground">
      <Link to={`/product/${product.id}`} className="block hover:opacity-80 transition-opacity">
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
      <div className="border-t border-foreground flex">
        <button
          onClick={() => addItem(product)}
          className="flex-1 py-2 text-xs font-medium hover:bg-foreground hover:text-background transition-colors"
        >
          ADD TO CART
        </button>
        <Link
          to={`/reviews/${product.id}`}
          className="border-l border-foreground flex-1 py-2 text-xs font-medium text-center hover:bg-foreground hover:text-background transition-colors"
        >
          REVIEWS
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
