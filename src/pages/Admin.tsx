import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { decryptMessage } from '@/lib/e2e-crypto';
import { generateKeyPair } from '@/lib/e2e-crypto';
import { ADMIN_PASSWORD, setAdminPublicKey, getAdminPublicKey } from '@/lib/admin-keys';
import { getAdminAuth, setAdminAuth, getAdminPrivateKey, setAdminPrivateKey } from '@/lib/cookies';
import Chat from '@/components/Chat';

const Admin = () => {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [tab, setTab] = useState<'products' | 'orders' | 'chat'>('products');
  const [generatedKeys, setGeneratedKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price_xmr: 0, image_url: '/placeholder.svg' });

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [decryptedDetails, setDecryptedDetails] = useState<Record<string, string>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [customerPubKey, setCustomerPubKey] = useState<string>('');

  useEffect(() => {
    if (getAdminAuth() === 'true') setAuthed(true);
    if (getAdminPrivateKey()) setHasKey(true);
  }, []);

  useEffect(() => {
    if (authed) {
      fetchProducts();
      fetchOrders();
    }
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setAdminAuth('true');
    }
  };

  const handleGenerateKeys = async () => {
    const keys = await generateKeyPair();
    setGeneratedKeys(keys);
  };

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyToSave = generatedKeys ? generatedKeys.privateKey : privateKeyInput;
    setAdminPrivateKey(keyToSave);
    if (generatedKeys) {
      setAdminPublicKey(generatedKeys.publicKey);
    }
    setHasKey(true);
  };

  const handleImportKey = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPrivateKey(privateKeyInput);
    setHasKey(true);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at');
    if (data) setProducts(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*, products(name), users(public_key)').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('products').insert(newProduct);
    setNewProduct({ name: '', description: '', price_xmr: 0, image_url: '/placeholder.svg' });
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const decryptOrder = async (orderId: string, encrypted: string, customerPubKeyStr: string) => {
    const key = getAdminPrivateKey();
    if (!key) return;
    const decrypted = await decryptMessage(encrypted, key, customerPubKeyStr);
    setDecryptedDetails((prev) => ({ ...prev, [orderId]: decrypted }));
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    fetchOrders();
  };

  const openChat = async (orderId: string, userId: string) => {
    setSelectedOrderId(orderId);
    const { data } = await supabase.from('users').select('public_key').eq('id', userId).single();
    if (data) setCustomerPubKey(data.public_key);
    setTab('chat');
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <form onSubmit={handleLogin} className="w-full max-w-sm px-6">
          <h1 className="text-sm font-medium mb-8 text-center tracking-widest">ADMIN</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-foreground bg-background px-4 py-3 text-sm text-center focus:outline-none"
            placeholder="Password"
          />
          <button type="submit" className="w-full border border-foreground mt-4 py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors">
            LOGIN
          </button>
        </form>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-lg px-6 space-y-6">
          <h1 className="text-sm font-medium mb-4 text-center tracking-widest">SETUP ENCRYPTION KEYS</h1>
          
          {!generatedKeys ? (
            <div className="space-y-4">
              <button
                onClick={handleGenerateKeys}
                className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
              >
                GENERATE NEW KEYPAIR
              </button>
              <div className="text-center text-xs opacity-40">— OR —</div>
              <form onSubmit={handleImportKey} className="space-y-4">
                <textarea
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  className="w-full border border-foreground bg-background p-4 text-xs font-mono resize-none h-32 focus:outline-none"
                  placeholder="Paste existing private key (JWK JSON)..."
                />
                <button type="submit" className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors">
                  IMPORT KEY
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleKeySubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs block">PUBLIC KEY (share with customers — saved automatically)</label>
                <textarea
                  readOnly
                  value={generatedKeys.publicKey}
                  className="w-full border border-foreground bg-muted p-3 text-xs font-mono resize-none h-16 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs block">PRIVATE KEY (save this securely — stored in browser)</label>
                <textarea
                  readOnly
                  value={generatedKeys.privateKey}
                  className="w-full border border-foreground bg-muted p-3 text-xs font-mono resize-none h-32 focus:outline-none"
                />
              </div>
              <p className="text-xs opacity-60">⚠ Copy and save your private key somewhere safe. If you lose it, you cannot decrypt orders.</p>
              <button type="submit" className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors">
                SAVE & CONTINUE
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-foreground">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium tracking-widest">ADMIN</span>
          <div className="flex gap-4 text-sm">
            {(['products', 'orders', 'chat'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`uppercase ${tab === t ? 'underline' : 'opacity-40 hover:opacity-80'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {tab === 'products' && (
          <div className="space-y-8">
            <form onSubmit={addProduct} className="border border-foreground p-6 space-y-4">
              <h2 className="text-xs font-medium tracking-widest">ADD PRODUCT</h2>
              <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Name" className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none" required />
              <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Description" className="w-full border border-foreground bg-background px-4 py-2 text-sm resize-none h-20 focus:outline-none" />
              <input type="number" step="0.001" value={newProduct.price_xmr} onChange={(e) => setNewProduct({ ...newProduct, price_xmr: parseFloat(e.target.value) })} placeholder="Price (XMR)" className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none" />
              <button type="submit" className="border border-foreground px-6 py-2 text-sm hover:bg-foreground hover:text-background transition-colors">ADD</button>
            </form>
            <div className="space-y-px border border-foreground">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-foreground last:border-b-0">
                  <div className="text-sm">{p.name} — <span className="font-mono">{p.price_xmr} XMR</span></div>
                  <button onClick={() => deleteProduct(p.id)} className="text-xs border border-foreground px-3 py-1 hover:bg-foreground hover:text-background transition-colors">DELETE</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.map((o) => {
              const custKey = (o as any).users?.public_key || '';
              return (
                <div key={o.id} className="border border-foreground p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{(o as any).products?.name || 'Product'} — <span className="font-mono">{o.price_xmr} XMR</span></span>
                    <span className="uppercase text-xs border border-foreground px-2 py-1">{o.status}</span>
                  </div>
                  <div className="flex gap-2">
                    {['pending', 'confirmed', 'shipped', 'delivered'].map((s) => (
                      <button key={s} onClick={() => updateStatus(o.id, s)} className={`text-xs border border-foreground px-2 py-1 ${o.status === s ? 'bg-foreground text-background' : 'hover:bg-foreground hover:text-background'} transition-colors`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => decryptOrder(o.id, o.encrypted_details, custKey)} className="text-xs underline hover:opacity-60">
                    Decrypt details
                  </button>
                  {decryptedDetails[o.id] && (
                    <pre className="text-xs font-mono bg-muted p-3 whitespace-pre-wrap">{decryptedDetails[o.id]}</pre>
                  )}
                  <button onClick={() => openChat(o.id, o.user_id)} className="text-xs underline hover:opacity-60 block">
                    Open chat
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'chat' && selectedOrderId && (
          <div className="space-y-4">
            <p className="text-xs opacity-40">Chat for order #{selectedOrderId.slice(0, 8)}</p>
            <Chat orderId={selectedOrderId} isAdmin customerPublicKey={customerPubKey} />
          </div>
        )}

        {tab === 'chat' && !selectedOrderId && (
          <p className="text-sm opacity-40">Select an order from the Orders tab to open chat.</p>
        )}
      </main>
    </div>
  );
};

export default Admin;
