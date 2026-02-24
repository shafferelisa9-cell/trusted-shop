import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage } from '@/lib/e2e-crypto';
import { getAdminPublicKey } from '@/lib/admin-keys';
import { getUserId, getPrivateKey } from '@/lib/cookies';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const XMR_ADDRESS = '4AdUndXHHZ6cfufTMvppY6JwXNouMBzS...';

const OrderForm = ({ product }: { product: Product }) => {
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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
      const details = JSON.stringify({ address, notes });
      const encrypted = await encryptMessage(details, privateKey, adminPubKey);

      // Get customer's current public key to store with order for future decryption
      const { data: userData } = await supabase.from('users').select('public_key').eq('id', userId).single();
      const customerPubKey = userData?.public_key || null;

      const { data, error: dbErr } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          product_id: product.id,
          encrypted_details: encrypted,
          price_xmr: product.price_xmr,
          xmr_address: XMR_ADDRESS,
          sender_public_key: customerPubKey,
        } as any)
        .select('tracking_token')
        .single();

      if (dbErr) throw dbErr;
      setTrackingToken(data.tracking_token);
    } catch (err) {
      console.error('Order failed:', err);
      setError('Failed to place order.');
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
        {submitting ? 'ENCRYPTING & SUBMITTING...' : 'SUBMIT ORDER'}
      </button>
      <p className="text-xs opacity-60">Your details are E2E-encrypted before leaving your browser.</p>
    </form>
  );
};

export default OrderForm;
