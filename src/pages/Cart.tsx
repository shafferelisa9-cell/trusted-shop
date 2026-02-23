import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { useCart } from '@/contexts/CartContext';

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, totalXMR } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-medium tracking-widest">CART</h1>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs underline hover:opacity-60">
              Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm opacity-40">Your cart is empty.</p>
            <Link to="/" className="text-sm underline hover:opacity-60">Browse products</Link>
          </div>
        ) : (
          <>
            <div className="border border-foreground">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-4 border-b border-foreground last:border-b-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-muted border border-foreground flex-shrink-0">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <Link to={`/product/${item.product.id}`} className="text-sm font-medium hover:opacity-60">
                        {item.product.name}
                      </Link>
                      <p className="text-sm font-mono mt-0.5">{item.product.price_xmr} XMR</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-foreground">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="px-3 py-1 text-sm hover:bg-foreground hover:text-background transition-colors"
                      >
                        −
                      </button>
                      <span className="px-3 py-1 text-sm font-mono border-x border-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="px-3 py-1 text-sm hover:bg-foreground hover:text-background transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-xs border border-foreground px-3 py-1 hover:bg-foreground hover:text-background transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-foreground p-4 flex items-center justify-between">
              <span className="text-sm font-medium">TOTAL</span>
              <span className="text-lg font-mono">{totalXMR.toFixed(4)} XMR</span>
            </div>

            <p className="text-xs opacity-60">
              To purchase, visit each product page and place individual orders. Cart is for reference only.
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default Cart;
