import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { getUserId } from '@/lib/cookies';

const MyOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const userId = getUserId();

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('orders')
      .select('*, products(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data);
      });
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <h1 className="text-sm font-medium tracking-widest">MY ORDERS</h1>
        {!userId ? (
          <p className="text-sm opacity-40">No user session found.</p>
        ) : orders.length === 0 ? (
          <p className="text-sm opacity-40">No orders yet.</p>
        ) : (
          <div className="space-y-px border border-foreground">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/order/${order.tracking_token}`}
                className="flex items-center justify-between p-4 hover:bg-muted transition-colors border-b border-foreground last:border-b-0"
              >
                <div className="text-sm">
                  <span className="opacity-40">#{order.tracking_token.slice(0, 8)} — </span>
                  {(order as any).products?.name || 'Product'}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono">{order.price_xmr} XMR</span>
                  <span className="text-xs uppercase border border-foreground px-2 py-1">
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyOrders;
