import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useCart } from '@/contexts/CartContext';
import { useXmrRate } from '@/hooks/useXmrRate';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage } from '@/lib/e2e-crypto';
import { getAdminPublicKey } from '@/lib/admin-keys';
import { getUserId, getPrivateKey } from '@/lib/cookies';

const XMR_WALLET = 'NAGSOMWALLET';

interface OrderResult {
  productName: string;
  trackingToken: string;
  priceXmr: number;
}

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, totalXMR } = useCart();
  const { xmrToUsd } = useXmrRate();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResults, setOrderResults] = useState<OrderResult[] | null>(null);

  const totalUsd = xmrToUsd(totalXMR);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getUserId();
    const privateKey = getPrivateKey();
    const adminPubKey = await getAdminPublicKey();

    if (!userId || !privateKey) {
      setError('Encryption keys not ready. Please visit the Messages page first to initialize your keys, then try again.');
      return;
    }
    if (!adminPubKey) {
      setError('Admin has not configured encryption keys yet. Please try again later.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const details = JSON.stringify({ address, notes, items: items.map(i => ({ name: i.product.name, qty: i.quantity })) });
      const encrypted = await encryptMessage(details, privateKey, adminPubKey);

      const { data: userData } = await supabase.from('users').select('public_key').eq('id', userId).single();
      const customerPubKey = userData?.public_key || null;

      const results: OrderResult[] = [];

      for (const item of items) {
        const ip = item.product as any;
        const iMinQty = ip.min_quantity ?? 1;
        const itemXmr = item.product.price_xmr * item.quantity / iMinQty;
        const { data, error: dbErr } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            product_id: item.product.id,
            encrypted_details: encrypted,
            price_xmr: itemXmr,
            xmr_address: XMR_WALLET,
            sender_public_key: customerPubKey,
          } as any)
          .select('tracking_token')
          .single();

        if (dbErr) throw dbErr;
        results.push({
          productName: item.product.name,
          trackingToken: data.tracking_token,
          priceXmr: itemXmr,
        });
      }

      setOrderResults(results);
      clearCart();
    } catch (err) {
      console.error('Order failed:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Order confirmation view
  if (orderResults) {
    const totalOrderXmr = orderResults.reduce((s, r) => s + r.priceXmr, 0);
    const totalOrderUsd = xmrToUsd(totalOrderXmr);
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
          <h1 className="text-sm font-medium tracking-widest">ORDER PLACED</h1>

          <div className="border border-foreground p-6 space-y-4">
            <p className="text-sm">Send exactly:</p>
            <p className="font-mono text-lg">
              {totalOrderXmr.toFixed(4)} XMR
              {totalOrderUsd !== null && (
                <span className="text-sm opacity-50 ml-2">~${totalOrderUsd.toFixed(2)}</span>
              )}
            </p>
            <p className="text-sm">To wallet address:</p>
            <p className="font-mono text-xs break-all bg-muted p-3 border border-foreground select-all">
              {XMR_WALLET}
            </p>
          </div>

          <div className="border border-foreground p-6 space-y-4">
            <h2 className="text-xs font-medium tracking-widest">TRACKING LINKS</h2>
            <div className="space-y-2">
              {orderResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{r.productName} — {r.priceXmr.toFixed(4)} XMR</span>
                  <button
                    onClick={() => navigate(`/order/${r.trackingToken}`)}
                    className="text-xs underline hover:opacity-60"
                  >
                    Track
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Link to="/" className="text-sm underline hover:opacity-60 block">
            Continue shopping
          </Link>
        </main>
      </div>
    );
  }

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
                const minQty = p.min_quantity ?? 1;
                const itemXmr = item.product.price_xmr * item.quantity / minQty;
                const itemUsd = xmrToUsd(itemXmr);
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
                        <p className="text-sm font-mono mt-0.5">
                          {itemXmr.toFixed(4)} XMR
                          {itemUsd !== null && (
                            <span className="opacity-50 ml-1.5">~${itemUsd.toFixed(2)}</span>
                          )}
                        </p>
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
              <span className="text-lg font-mono">
                {totalXMR.toFixed(4)} XMR
                {totalUsd !== null && (
                  <span className="text-sm opacity-50 ml-2">~${totalUsd.toFixed(2)}</span>
                )}
              </span>
            </div>

            {/* Checkout form */}
            <form onSubmit={handlePlaceOrder} className="border border-foreground p-6 space-y-4">
              <h2 className="text-xs font-medium tracking-widest">CHECKOUT</h2>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="space-y-2">
                <label className="text-xs block">SHIPPING ADDRESS</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-foreground bg-background p-3 text-sm resize-none h-24 focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs block">NOTES (OPTIONAL)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-foreground bg-background p-3 text-sm resize-none h-16 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !address}
                className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
              >
                {submitting ? 'ENCRYPTING & SUBMITTING...' : `PLACE ORDER — ${totalXMR.toFixed(4)} XMR`}
              </button>
              <p className="text-xs opacity-60">Your shipping details are E2E-encrypted before leaving your browser.</p>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default Cart;
