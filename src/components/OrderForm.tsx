import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage } from '@/lib/pgp';
import { ADMIN_PUBLIC_KEY } from '@/lib/admin-keys';
import { getUserId } from '@/lib/cookies';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const XMR_ADDRESS = '4AdUndXHHZ6cfufTMvppY6JwXNouMBzS...';

const OrderForm = ({ product }: { product: Product }) => {
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getUserId();
    if (!userId) return;

    setSubmitting(true);
    try {
      const details = JSON.stringify({ address, notes });
      const encrypted = await encryptMessage(details, ADMIN_PUBLIC_KEY);

      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          product_id: product.id,
          encrypted_details: encrypted,
          price_xmr: product.price_xmr,
          xmr_address: XMR_ADDRESS,
        })
        .select('tracking_token')
        .single();

      if (error) throw error;
      setTrackingToken(data.tracking_token);
    } catch (err) {
      console.error('Order failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (trackingToken) {
    return (
      <div className="border border-foreground p-6 space-y-4">
        <h3 className="text-sm font-medium">ORDER PLACED</h3>
        <div className="space-y-2 text-sm">
          <p>Send exactly:</p>
          <p className="font-mono text-lg">{product.price_xmr} XMR</p>
          <p>To address:</p>
          <p className="font-mono text-xs break-all">{XMR_ADDRESS}</p>
        </div>
        <div className="border-t border-foreground pt-4 space-y-2">
          <p className="text-sm">Track your order:</p>
          <button
            onClick={() => navigate(`/order/${trackingToken}`)}
            className="text-sm underline hover:opacity-60"
          >
            /order/{trackingToken.slice(0, 8)}...
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-foreground p-6 space-y-4">
      <h3 className="text-sm font-medium">PLACE ORDER</h3>
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
        {submitting ? 'ENCRYPTING & SUBMITTING...' : 'SUBMIT ORDER'}
      </button>
      <p className="text-xs opacity-60">Your details are PGP-encrypted before leaving your browser.</p>
    </form>
  );
};

export default OrderForm;
