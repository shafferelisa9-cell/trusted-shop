import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { decryptMessage } from '@/lib/e2e-crypto';
import { getAdminPrivateKey, setAdminPrivateKey } from '@/lib/cookies';
import { generateKeyPair } from '@/lib/e2e-crypto';
import { setAdminPublicKey } from '@/lib/admin-keys';

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'products' | 'orders' | 'messages'>('products');
  const [hasKey, setHasKey] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [generatedKeys, setGeneratedKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);

  // Products
  const [products, setProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price_xmr: 0, image_url: '/placeholder.svg' });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [decryptedDetails, setDecryptedDetails] = useState<Record<string, string>>({});

  // Messages (all user threads)
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (getAdminPrivateKey()) setHasKey(true);
  }, []);

  useEffect(() => {
    if (isAdmin && hasKey) {
      fetchProducts();
      fetchOrders();
      fetchThreads();
    }
  }, [isAdmin, hasKey]);

  // Key setup
  const handleGenerateKeys = async () => {
    const keys = await generateKeyPair();
    setGeneratedKeys(keys);
  };

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    const key = generatedKeys ? generatedKeys.privateKey : privateKeyInput;
    setAdminPrivateKey(key);
    if (generatedKeys) setAdminPublicKey(generatedKeys.publicKey);
    setHasKey(true);
  };

  // Products
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at');
    if (data) setProducts(data);
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

  const updatePrice = async (id: string) => {
    await supabase.from('products').update({ price_xmr: editPrice }).eq('id', id);
    setEditingProduct(null);
    fetchProducts();
  };

  // Orders
  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*, products(name), users(public_key)').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const decryptOrder = async (orderId: string, encrypted: string, customerPubKey: string) => {
    const key = getAdminPrivateKey();
    if (!key) return;
    const decrypted = await decryptMessage(encrypted, key, customerPubKey);
    setDecryptedDetails((prev) => ({ ...prev, [orderId]: decrypted }));
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    fetchOrders();
  };

  // Messages
  const fetchThreads = async () => {
    // Get distinct order_ids (thread ids) from messages
    const { data } = await supabase
      .from('messages')
      .select('order_id')
      .order('created_at', { ascending: false });
    if (data) {
      const uniqueThreads = [...new Set(data.map((m: any) => m.order_id))];
      setThreads(uniqueThreads);
    }
  };

  const openThread = async (threadId: string) => {
    setSelectedThread(threadId);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', threadId)
      .order('created_at', { ascending: true });

    if (data) {
      const adminKey = getAdminPrivateKey();
      // Get customer public key
      const { data: userData } = await supabase.from('users').select('public_key').eq('id', threadId).single();
      const custPubKey = userData?.public_key;

      if (adminKey && custPubKey) {
        const decrypted = await Promise.all(
          data.map(async (msg: any) => {
            try {
              const d = await decryptMessage(msg.encrypted_content, adminKey, custPubKey);
              return { ...msg, decrypted: d };
            } catch {
              return { ...msg, decrypted: '[unable to decrypt]' };
            }
          })
        );
        setThreadMessages(decrypted);
      } else {
        setThreadMessages(data.map((m: any) => ({ ...m, decrypted: '[no keys]' })));
      }
    }
  };

  const sendReply = async () => {
    if (!replyInput.trim() || !selectedThread) return;
    setReplySending(true);
    try {
      const adminKey = getAdminPrivateKey();
      const { data: userData } = await supabase.from('users').select('public_key').eq('id', selectedThread).single();
      if (!adminKey || !userData?.public_key) return;

      const { encryptMessage } = await import('@/lib/e2e-crypto');
      const encrypted = await encryptMessage(replyInput, adminKey, userData.public_key);

      await supabase.from('messages').insert({
        order_id: selectedThread,
        encrypted_content: encrypted,
        sender: 'admin',
      });

      setReplyInput('');
      openThread(selectedThread);
    } catch (err) {
      console.error('Reply failed:', err);
    } finally {
      setReplySending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm opacity-40">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-lg px-6 space-y-6">
          <h1 className="text-sm font-medium text-center tracking-widest">ADMIN — SETUP ENCRYPTION</h1>
          {!generatedKeys ? (
            <div className="space-y-4">
              <button onClick={handleGenerateKeys} className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors">
                GENERATE NEW KEYPAIR
              </button>
              <div className="text-center text-xs opacity-40">— OR —</div>
              <form onSubmit={handleSaveKeys} className="space-y-4">
                <textarea
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  className="w-full border border-foreground bg-background p-4 text-xs font-mono resize-none h-32 focus:outline-none"
                  placeholder="Paste existing private key..."
                />
                <button type="submit" className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors">
                  IMPORT KEY
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSaveKeys} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs block">PUBLIC KEY (saved automatically for customers)</label>
                <textarea readOnly value={generatedKeys.publicKey} className="w-full border border-foreground bg-muted p-3 text-xs font-mono resize-none h-16 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs block">PRIVATE KEY (save securely!)</label>
                <textarea readOnly value={generatedKeys.privateKey} className="w-full border border-foreground bg-muted p-3 text-xs font-mono resize-none h-32 focus:outline-none" />
              </div>
              <p className="text-xs opacity-60">⚠ Copy your private key somewhere safe.</p>
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
          <span className="text-sm font-medium tracking-widest">ADMIN DASHBOARD</span>
          <div className="flex gap-4 text-sm">
            {(['products', 'orders', 'messages'] as const).map((t) => (
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
        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-8">
            <form onSubmit={addProduct} className="border border-foreground p-6 space-y-4">
              <h2 className="text-xs font-medium tracking-widest">ADD PRODUCT</h2>
              <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Name" className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none" required />
              <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Description" className="w-full border border-foreground bg-background px-4 py-2 text-sm resize-none h-20 focus:outline-none" />
              <input value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} placeholder="Image URL" className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none" />
              <input type="number" step="0.001" value={newProduct.price_xmr} onChange={(e) => setNewProduct({ ...newProduct, price_xmr: parseFloat(e.target.value) })} placeholder="Price (XMR)" className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none" />
              <button type="submit" className="border border-foreground px-6 py-2 text-sm hover:bg-foreground hover:text-background transition-colors">ADD PRODUCT</button>
            </form>

            <div className="space-y-px border border-foreground">
              {products.map((p) => (
                <div key={p.id} className="p-4 border-b border-foreground last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{p.name}</span>
                      {editingProduct === p.id ? (
                        <span className="ml-2">
                          <input
                            type="number"
                            step="0.001"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                            className="w-24 border border-foreground bg-background px-2 py-1 text-xs font-mono focus:outline-none"
                          />
                          <button onClick={() => updatePrice(p.id)} className="ml-2 text-xs underline">Save</button>
                          <button onClick={() => setEditingProduct(null)} className="ml-2 text-xs underline opacity-40">Cancel</button>
                        </span>
                      ) : (
                        <span className="font-mono ml-2">{p.price_xmr} XMR
                          <button onClick={() => { setEditingProduct(p.id); setEditPrice(p.price_xmr); }} className="ml-2 text-xs underline opacity-60">edit</button>
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteProduct(p.id)} className="text-xs border border-foreground px-3 py-1 hover:bg-foreground hover:text-background transition-colors">DELETE</button>
                  </div>
                  <p className="text-xs opacity-60 mt-1">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 && <p className="text-sm opacity-40">No orders yet.</p>}
            {orders.map((o) => {
              const custKey = (o as any).users?.public_key || '';
              return (
                <div key={o.id} className="border border-foreground p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{(o as any).products?.name || 'Product'} — <span className="font-mono">{o.price_xmr} XMR</span></span>
                    <span className="uppercase text-xs border border-foreground px-2 py-1">{o.status}</span>
                  </div>
                  <div className="text-xs opacity-40 font-mono">Token: {o.tracking_token.slice(0, 12)}...</div>
                  <div className="flex gap-2 flex-wrap">
                    {['pending', 'confirmed', 'shipped', 'delivered'].map((s) => (
                      <button key={s} onClick={() => updateStatus(o.id, s)} className={`text-xs border border-foreground px-3 py-1 ${o.status === s ? 'bg-foreground text-background' : 'hover:bg-foreground hover:text-background'} transition-colors`}>
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {custKey && (
                    <button onClick={() => decryptOrder(o.id, o.encrypted_details, custKey)} className="text-xs underline hover:opacity-60">
                      Decrypt details
                    </button>
                  )}
                  {decryptedDetails[o.id] && (
                    <pre className="text-xs font-mono bg-muted p-3 whitespace-pre-wrap border border-foreground">{decryptedDetails[o.id]}</pre>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MESSAGES TAB */}
        {tab === 'messages' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-foreground md:col-span-1">
              <div className="p-3 border-b border-foreground">
                <h3 className="text-xs font-medium tracking-widest">CONVERSATIONS</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {threads.length === 0 && <p className="text-xs opacity-40 p-3">No conversations.</p>}
                {threads.map((threadId) => (
                  <button
                    key={threadId}
                    onClick={() => openThread(threadId)}
                    className={`w-full text-left p-3 text-xs font-mono border-b border-foreground last:border-b-0 hover:bg-muted transition-colors ${selectedThread === threadId ? 'bg-muted' : ''}`}
                  >
                    {threadId.slice(0, 12)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-foreground md:col-span-2 flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!selectedThread && (
                  <p className="text-sm opacity-40 text-center py-8">Select a conversation.</p>
                )}
                {threadMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-sm ${msg.sender === 'admin' ? 'text-right' : 'text-left'}`}
                  >
                    <span className="text-xs opacity-40 uppercase">{msg.sender}</span>
                    <p className="mt-0.5">{msg.decrypted || '[encrypted]'}</p>
                    <span className="text-xs opacity-20">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
              {selectedThread && (
                <div className="border-t border-foreground flex">
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Reply (encrypted)..."
                    className="flex-1 px-4 py-3 text-sm bg-background focus:outline-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={replySending || !replyInput.trim()}
                    className="border-l border-foreground px-6 text-sm font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
                  >
                    SEND
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
