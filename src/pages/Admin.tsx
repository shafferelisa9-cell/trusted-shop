import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { decryptMessage, encryptMessage, generateKeyPair } from '@/lib/e2e-crypto';
import { getAdminPrivateKey, setAdminPrivateKey } from '@/lib/cookies';
import { setAdminPublicKey, getAdminPublicKey } from '@/lib/admin-keys';
import Header from '@/components/Header';

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
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [decryptedDetails, setDecryptedDetails] = useState<Record<string, string>>({});

  // Messages
  const [threads, setThreads] = useState<{ id: string; email?: string }[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [replySending, setReplySending] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, revenue: 0 });

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

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = generatedKeys ? generatedKeys.privateKey : privateKeyInput;
    setAdminPrivateKey(key);
    if (generatedKeys) {
      await setAdminPublicKey(generatedKeys.publicKey);
    }
    setHasKey(true);
  };

  // Products
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at');
    if (data) setProducts(data);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingImage(true);
    try {
      let imageUrl = newProduct.image_url;
      if (newImageFile) {
        imageUrl = await uploadImage(newImageFile);
      }
      await supabase.from('products').insert({ ...newProduct, image_url: imageUrl });
      setNewProduct({ name: '', description: '', price_xmr: 0, image_url: '/placeholder.svg' });
      setNewImageFile(null);
      fetchProducts();
    } catch (err) {
      console.error('Add product failed:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const changeProductImage = async (productId: string, file: File) => {
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImage(file);
      await supabase.from('products').update({ image_url: imageUrl }).eq('id', productId);
      fetchProducts();
    } catch (err) {
      console.error('Image change failed:', err);
    } finally {
      setUploadingImage(false);
    }
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
    if (data) {
      setOrders(data);
      const total = data.length;
      const pending = data.filter((o: any) => o.status === 'pending').length;
      const revenue = data.filter((o: any) => o.status === 'delivered' || o.status === 'confirmed' || o.status === 'shipped').reduce((sum: number, o: any) => sum + Number(o.price_xmr), 0);
      setStats({ total, pending, revenue });
    }
  };

  const decryptOrder = async (orderId: string, encrypted: string, customerPubKey: string, orderSenderPubKey?: string) => {
    const key = getAdminPrivateKey();
    if (!key) return;
    // Use the sender's public key stored at order creation time, fallback to current DB key
    const pubKey = orderSenderPubKey || customerPubKey;
    const decrypted = await decryptMessage(encrypted, key, pubKey);
    setDecryptedDetails((prev) => ({ ...prev, [orderId]: decrypted }));
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    fetchOrders();
  };

  // Messages
  const fetchThreads = async () => {
    const { data } = await supabase
      .from('messages')
      .select('order_id')
      .order('created_at', { ascending: false });
    if (data) {
      const uniqueIds = [...new Set(data.map((m: any) => m.order_id))];
      // Fetch user emails via users -> profiles
      const threadList = await Promise.all(
        uniqueIds.map(async (id) => {
          const { data: userData } = await supabase.from('users').select('auth_id').eq('id', id).maybeSingle();
          let email: string | undefined;
          if (userData?.auth_id) {
            const { data: profile } = await supabase.from('profiles').select('email').eq('auth_id', userData.auth_id).maybeSingle();
            email = profile?.email ?? undefined;
          }
          return { id, email };
        })
      );
      setThreads(threadList);
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
      const { data: userData } = await supabase.from('users').select('public_key').eq('id', threadId).single();
      const custPubKey = userData?.public_key;

      if (adminKey) {
        const decrypted = await Promise.all(
          data.map(async (msg: any) => {
            try {
              let pubKeyForDecrypt: string | null;
              if (msg.sender === 'customer') {
                // Use sender_public_key stored at send time, fallback to current DB key
                pubKeyForDecrypt = msg.sender_public_key || custPubKey || null;
              } else {
                // Admin's own messages: need customer pub key to derive same shared secret
                pubKeyForDecrypt = custPubKey || null;
              }
              if (!pubKeyForDecrypt) return { ...msg, decrypted: '[missing key]' };
              const d = await decryptMessage(msg.encrypted_content, adminKey, pubKeyForDecrypt);
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

      const encrypted = await encryptMessage(replyInput, adminKey, userData.public_key);

      // Get admin's public key to store with message
      const adminPubKey = await getAdminPublicKey();

      await supabase.from('messages').insert({
        order_id: selectedThread,
        encrypted_content: encrypted,
        sender: 'admin',
        sender_public_key: adminPubKey,
      } as any);

      setReplyInput('');
      openThread(selectedThread);
    } catch (err) {
      console.error('Reply failed:', err);
    } finally {
      setReplySending(false);
    }
  };

  // Realtime for messages
  useEffect(() => {
    if (!isAdmin || !hasKey) return;
    const channel = supabase
      .channel('admin-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchThreads();
        if (selectedThread) openThread(selectedThread);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, hasKey, selectedThread]);

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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
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
                  <label className="text-xs block">PUBLIC KEY (saved to database for customers)</label>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
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

      {/* Stats bar */}
      <div className="border-b border-foreground">
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-8 text-sm">
          <div><span className="opacity-40">Orders:</span> <span className="font-mono">{stats.total}</span></div>
          <div><span className="opacity-40">Pending:</span> <span className="font-mono">{stats.pending}</span></div>
          <div><span className="opacity-40">Revenue:</span> <span className="font-mono">{stats.revenue.toFixed(4)} XMR</span></div>
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
              <div className="space-y-1">
                <label className="text-xs opacity-60">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                  className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                {newImageFile && <p className="text-xs opacity-60">Selected: {newImageFile.name}</p>}
              </div>
              <input type="number" step="0.001" value={newProduct.price_xmr} onChange={(e) => setNewProduct({ ...newProduct, price_xmr: parseFloat(e.target.value) })} placeholder="Price (XMR)" className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none" />
              <button type="submit" disabled={uploadingImage} className="border border-foreground px-6 py-2 text-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-40">
                {uploadingImage ? 'UPLOADING...' : 'ADD PRODUCT'}
              </button>
            </form>

            <div className="space-y-px border border-foreground">
              {products.map((p) => (
                <div key={p.id} className="p-4 border-b border-foreground last:border-b-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted border border-foreground flex-shrink-0 relative group cursor-pointer">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-foreground/80 text-background text-[8px] font-medium flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        CHANGE
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) changeProductImage(p.id, file);
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex-1 flex items-center justify-between">
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
                  </div>
                  <p className="text-xs opacity-60 mt-1 ml-16">{p.description}</p>
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
                  <div className="text-xs opacity-60 space-y-1">
                    <div className="font-mono">XMR Address: {o.xmr_address || '—'}</div>
                    <div>Date: {new Date(o.created_at).toLocaleDateString()}</div>
                    <div className="font-mono">Token: {o.tracking_token.slice(0, 12)}...</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['pending', 'confirmed', 'shipped', 'delivered'].map((s) => (
                      <button key={s} onClick={() => updateStatus(o.id, s)} className={`text-xs border border-foreground px-3 py-1 ${o.status === s ? 'bg-foreground text-background' : 'hover:bg-foreground hover:text-background'} transition-colors`}>
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {custKey && !decryptedDetails[o.id] && (
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
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => openThread(thread.id)}
                    className={`w-full text-left p-3 text-xs border-b border-foreground last:border-b-0 hover:bg-muted transition-colors ${selectedThread === thread.id ? 'bg-muted' : ''}`}
                  >
                    <div className="font-medium">{thread.email || 'Unknown user'}</div>
                    <div className="font-mono opacity-40 mt-0.5">{thread.id.slice(0, 8)}...</div>
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
