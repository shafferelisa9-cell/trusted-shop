import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

const XMR_WALLET = 'NAGSOMWALLET';

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, totalXMR } = useCart();
  const { user } = useAuth();

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
              {items.map((item) => {
                const p = item.product as any;
                const step = p.quantity_step ?? 1;
                const unitType = p.unit_type ?? 'pcs';
                return (
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
                          onClick={() => updateQuantity(item.product.id, item.quantity - step)}
                          className="px-3 py-1 text-sm hover:bg-foreground hover:text-background transition-colors"
                        >
                          −
                        </button>
                        <span className="px-3 py-1 text-sm font-mono border-x border-foreground">
                          {item.quantity} {unitType}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + step)}
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
                );
              })}
            </div>

            <div className="border border-foreground p-4 flex items-center justify-between">
              <span className="text-sm font-medium">TOTAL</span>
              <span className="text-lg font-mono">{totalXMR.toFixed(4)} XMR</span>
            </div>

            {!user ? (
              <div className="border border-foreground p-6 space-y-4">
                <p className="text-sm">You need to <Link to="/auth" className="underline hover:opacity-60">log in</Link> to place an order.</p>
              </div>
            ) : (
              <div className="border border-foreground p-6 space-y-6">
                <h2 className="text-xs font-medium tracking-widest">HOW TO ORDER</h2>
                <div className="space-y-4 text-sm leading-relaxed">
                  <div className="space-y-2">
                    <h3 className="font-medium">1. GET MONERO (XMR)</h3>
                    <p className="opacity-80">
                      Download a Monero wallet like Cake Wallet (iOS/Android) or the official Monero GUI.
                      Buy XMR from exchanges like Kraken, Binance, or use decentralized options like Bisq.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">2. SEND PAYMENT</h3>
                    <p className="opacity-80">Send exactly:</p>
                    <p className="font-mono text-lg">{totalXMR.toFixed(4)} XMR</p>
                    <p className="opacity-80">To wallet address:</p>
                    <p className="font-mono text-xs break-all bg-muted p-3 border border-foreground select-all">
                      {XMR_WALLET}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">3. CONTACT US</h3>
                    <p className="opacity-80">
                      After sending payment, go to the <Link to="/messages" className="underline hover:opacity-60">Messages</Link> tab 
                      and send us your order details. Include what items you want and your shipping address.
                      All messages are end-to-end encrypted.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">4. TRACK ORDER</h3>
                    <p className="opacity-80">
                      We'll confirm your payment and update your order status. Check the <Link to="/orders" className="underline hover:opacity-60">Orders</Link> tab for updates.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Cart;
