import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Chat from '@/components/Chat';
import { getUserId } from '@/lib/cookies';

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

const OrderStatus = () => {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    supabase
      .rpc('get_order_by_token', { p_token: token })
      .then(({ data }) => {
        if (data) {
          setOrder(data as any);
          setProduct((data as any).products);
        }
      });
  }, [token]);

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-sm opacity-40">Loading order...</p>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isOwner = getUserId() === order.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <h1 className="text-sm font-medium tracking-widest">ORDER STATUS</h1>

        <div className="border border-foreground p-6 space-y-6">
          {product && (
            <div className="text-sm">
              <span className="opacity-40">Product: </span>{product.name}
            </div>
          )}
          <div className="text-sm">
            <span className="opacity-40">Amount: </span>
            <span className="font-mono">{order.price_xmr} XMR</span>
          </div>

          <div className="flex gap-2">
            {STATUS_STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex-1 py-2 text-center text-xs uppercase border ${
                  i <= currentStep
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground opacity-30'
                }`}
              >
                {step}
              </div>
            ))}
          </div>

          {order.xmr_address && (
            <div className="text-sm space-y-1">
              <span className="opacity-40">Pay to:</span>
              <p className="font-mono text-xs break-all">{order.xmr_address}</p>
            </div>
          )}
        </div>

        {isOwner ? (
          <div className="space-y-4">
            <h2 className="text-xs font-medium tracking-widest">MESSAGES</h2>
            <Chat orderId={order.id} />
          </div>
        ) : (
          <div className="border border-foreground p-6 space-y-2">
            <p className="text-sm opacity-60">Encrypted messages are only available on the original device/browser used to place this order.</p>
            <p className="text-xs opacity-40">If you cleared your browser data, you won't be able to read previous messages. You can still view order status and payment info above.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderStatus;
