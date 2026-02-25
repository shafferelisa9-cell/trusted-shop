import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { decryptMessage, encryptMessage, generateKeyPair } from '@/lib/e2e-crypto';
import { getAdminPrivateKey, setAdminPrivateKey } from '@/lib/cookies';
import { setAdminPublicKey, getAdminPublicKey, invalidateAdminPublicKeyCache } from '@/lib/admin-keys';
import { useXmrRate } from '@/hooks/useXmrRate';
import Header from '@/components/Header';

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'products' | 'orders' | 'messages'>('products');
  const [hasKey, setHasKey] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [generatedKeys, setGeneratedKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [existingPubKey, setExistingPubKey] = useState<string | null>(null);

  // Products
  const [products, setProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price_xmr: 0, image_url: '/placeholder.svg', min_quantity: 1, quantity_step: 1, unit_type: 'pcs' });
  const [newProductUsd, setNewProductUsd] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ name: string; description: string; categories: string[]; price_xmr: number; usd: string; min_quantity: number; quantity_step: number; unit_type: string }>({ name: '', description: '', categories: [], price_xmr: 0, usd: '', min_quantity: 1, quantity_step: 1, unit_type: 'pcs' });
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [bulkJson, setBulkJson] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; errors: string[] } | null>(null);

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

  // XMR Rate
  const { rate, xmrToUsd } = useXmrRate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (getAdminPrivateKey()) setHasKey(true);
    getAdminPublicKey().then((key) => setExistingPubKey(key));
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
      invalidateAdminPublicKeyCache();
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
      await supabase.from('products').insert({ ...newProduct, image_url: imageUrl } as any);
      setNewProduct({ name: '', description: '', price_xmr: 0, image_url: '/placeholder.svg', min_quantity: 1, quantity_step: 1, unit_type: 'pcs' });
      setNewProductUsd('');
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

  const addGalleryImage = async (productId: string, file: File) => {
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImage(file);
      const product = products.find((p) => p.id === productId);
      const existing = Array.isArray(product?.gallery_images) ? product.gallery_images : [];
      await (supabase as any).from('products').update({ gallery_images: [...existing, imageUrl] }).eq('id', productId);
      fetchProducts();
    } catch (err) {
      console.error('Gallery image add failed:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeGalleryImage = async (productId: string, index: number) => {
    const product = products.find((p) => p.id === productId);
    const existing = Array.isArray(product?.gallery_images) ? [...product.gallery_images] : [];
    existing.splice(index, 1);
    await (supabase as any).from('products').update({ gallery_images: existing }).eq('id', productId);
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const startEditing = (p: any) => {
    setEditingProduct(p.id);
    const usdVal = rate ? (p.price_xmr * rate).toFixed(2) : '';
    setEditFields({
      name: p.name,
      description: p.description || '',
      categories: Array.isArray(p.categories) ? [...p.categories] : [],
      price_xmr: p.price_xmr,
      usd: usdVal,
      min_quantity: p.min_quantity ?? 1,
      quantity_step: p.quantity_step ?? 1,
      unit_type: p.unit_type ?? 'pcs',
    });
    setNewCategoryInput('');
  };

  const saveProduct = async (id: string) => {
    await (supabase as any).from('products').update({
      name: editFields.name,
      description: editFields.description,
      categories: editFields.categories,
      price_xmr: editFields.price_xmr,
      min_quantity: editFields.min_quantity,
      quantity_step: editFields.quantity_step,
      unit_type: editFields.unit_type,
    }).eq('id', id);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleEditUsdChange = (usd: string) => {
    setEditFields((prev) => {
      const usdNum = parseFloat(usd);
      if (rate && !isNaN(usdNum)) {
        return { ...prev, usd, price_xmr: parseFloat((usdNum / rate).toFixed(6)) };
      }
      return { ...prev, usd };
    });
  };

  const handleEditXmrChange = (xmr: number) => {
    setEditFields((prev) => {
      const usd = rate ? (xmr * rate).toFixed(2) : prev.usd;
      return { ...prev, price_xmr: xmr, usd };
    });
  };

  const handleNewProductUsdChange = (usd: string) => {
    setNewProductUsd(usd);
    const usdNum = parseFloat(usd);
    if (rate && !isNaN(usdNum)) {
      setNewProduct((prev) => ({ ...prev, price_xmr: parseFloat((usdNum / rate).toFixed(6)) }));
    }
  };

  const handleNewProductXmrChange = (xmr: number) => {
    setNewProduct((prev) => ({ ...prev, price_xmr: xmr }));
    if (rate) setNewProductUsd((xmr * rate).toFixed(2));
  };

  const addCategory = () => {
    const cat = newCategoryInput.trim();
    if (cat && !editFields.categories.includes(cat)) {
      setEditFields((prev) => ({ ...prev, categories: [...prev.categories, cat] }));
    }
    setNewCategoryInput('');
  };

  const removeCategory = (cat: string) => {
    setEditFields((prev) => ({ ...prev, categories: prev.categories.filter((c) => c !== cat) }));
  };

  const bulkImportProducts = async () => {
    setBulkImporting(true);
    setBulkResult(null);
    const errors: string[] = [];
    let success = 0;
    try {
      let parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) parsed = [parsed];

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item.name) {
          errors.push(`Item ${i + 1}: missing required "name" field`);
          continue;
        }
        const row: any = {
          name: item.name,
          description: item.description || '',
          price_xmr: item.price ? parseFloat(item.price) : (item.price_xmr ? parseFloat(item.price_xmr) : 0),
          image_url: item.image_url || '/placeholder.svg',
          url: item.url || '',
          categories: item.categories || [],
          dosage: item.dosage || {},
          duration: item.duration || {},
          effects: item.effects || {},
          harm_reduction: item.harm_reduction || [],
          detection_times: item.detection_times || {},
          interactions: item.interactions || {},
          legal_status: item.legal_status || {},
        };
        const { error } = await supabase.from('products').insert(row);
        if (error) {
          errors.push(`"${item.name}": ${error.message}`);
        } else {
          success++;
        }
      }
    } catch (err: any) {
      errors.push(`JSON parse error: ${err.message}`);
    }
    setBulkResult({ success, errors });
    if (success > 0) {
      setBulkJson('');
      fetchProducts();
    }
    setBulkImporting(false);
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
                pubKeyForDecrypt = msg.sender_public_key || custPubKey || null;
              } else {
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
            {existingPubKey && (
              <div className="border border-destructive p-4 text-xs space-y-1">
                <p className="font-medium">An encryption key already exists in the database.</p>
                <p className="opacity-60">If you generate new keys, all previously encrypted orders and messages will become permanently unreadable. Import your existing private key instead if possible.</p>
              </div>
            )}
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
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs opacity-60">Price (XMR)</label>
                  <input type="number" step="0.000001" value={newProduct.price_xmr} onChange={(e) => handleNewProductXmrChange(parseFloat(e.target.value) || 0)} className="w-full border border-foreground bg-background px-4 py-2 text-sm font-mono focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs opacity-60">Price (USD){!rate && ' — loading rate...'}</label>
                  <input type="number" step="0.01" value={newProductUsd} onChange={(e) => handleNewProductUsdChange(e.target.value)} disabled={!rate} className="w-full border border-foreground bg-background px-4 py-2 text-sm font-mono focus:outline-none disabled:opacity-40" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs opacity-60">Min Quantity</label>
                  <input type="number" min="1" value={newProduct.min_quantity} onChange={(e) => setNewProduct({ ...newProduct, min_quantity: parseInt(e.target.value) || 1 })} className="w-full border border-foreground bg-background px-4 py-2 text-sm font-mono focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs opacity-60">Qty Step</label>
                  <input type="number" min="1" value={newProduct.quantity_step} onChange={(e) => setNewProduct({ ...newProduct, quantity_step: parseInt(e.target.value) || 1 })} className="w-full border border-foreground bg-background px-4 py-2 text-sm font-mono focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs opacity-60">Unit Type</label>
                  <input value={newProduct.unit_type} onChange={(e) => setNewProduct({ ...newProduct, unit_type: e.target.value })} placeholder="pcs, g, ml..." className="w-full border border-foreground bg-background px-4 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <button type="submit" disabled={uploadingImage} className="border border-foreground px-6 py-2 text-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-40">
                {uploadingImage ? 'UPLOADING...' : 'ADD PRODUCT'}
              </button>
            </form>

            <div className="border border-foreground p-6 space-y-4">
              <h2 className="text-xs font-medium tracking-widest">BULK IMPORT (JSON)</h2>
              <p className="text-xs opacity-60">
                Paste a JSON array of products (or a single object). Fields: name, url, categories, description, image_url, dosage, duration, effects, harm_reduction, detection_times, interactions, legal_status, price/price_xmr.
              </p>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder={'[\n  {\n    "name": "Product Name",\n    "description": "...",\n    "url": "https://...",\n    "categories": ["Stimulant"],\n    "image_url": "https://...",\n    "price": "0.05",\n    "dosage": { ... },\n    "effects": { ... }\n  }\n]'}
                className="w-full border border-foreground bg-background px-4 py-3 text-xs font-mono resize-none h-48 focus:outline-none"
              />
              <div className="flex items-center gap-4">
                <button
                  onClick={bulkImportProducts}
                  disabled={bulkImporting || !bulkJson.trim()}
                  className="border border-foreground px-6 py-2 text-sm hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
                >
                  {bulkImporting ? 'IMPORTING...' : 'IMPORT PRODUCTS'}
                </button>
                {bulkResult && (
                  <span className="text-xs">
                    <span className="font-medium">{bulkResult.success} imported</span>
                    {bulkResult.errors.length > 0 && (
                      <span className="text-destructive ml-2">{bulkResult.errors.length} failed</span>
                    )}
                  </span>
                )}
              </div>
              {bulkResult?.errors.length ? (
                <div className="text-xs text-destructive space-y-1">
                  {bulkResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-px border border-foreground">
              {products.map((p) => {
                const isEditing = editingProduct === p.id;
                const gallery: string[] = Array.isArray(p.gallery_images) ? p.gallery_images : [];
                return (
                  <div key={p.id} className="p-4 border-b border-foreground last:border-b-0">
                    <div className="flex items-start gap-4">
                      {/* Main image */}
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

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-3">
                            {/* Name */}
                            <input
                              value={editFields.name}
                              onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                              className="w-full border border-foreground bg-background px-3 py-1.5 text-sm focus:outline-none"
                              placeholder="Product name"
                            />
                            {/* Description */}
                            <textarea
                              value={editFields.description}
                              onChange={(e) => setEditFields((f) => ({ ...f, description: e.target.value }))}
                              className="w-full border border-foreground bg-background px-3 py-1.5 text-xs resize-none h-20 focus:outline-none"
                              placeholder="Description"
                            />
                            {/* Categories */}
                            <div>
                              <div className="flex gap-1 flex-wrap mb-1">
                                {editFields.categories.map((cat) => (
                                  <span key={cat} className="text-[10px] border border-foreground px-1.5 py-0.5 flex items-center gap-1">
                                    {cat}
                                    <button type="button" onClick={() => removeCategory(cat)} className="opacity-60 hover:opacity-100">×</button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-1">
                                <input
                                  value={newCategoryInput}
                                  onChange={(e) => setNewCategoryInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                                  className="border border-foreground bg-background px-2 py-1 text-xs focus:outline-none flex-1"
                                  placeholder="Add category..."
                                />
                                <button type="button" onClick={addCategory} className="text-xs border border-foreground px-2 py-1 hover:bg-foreground hover:text-background transition-colors">+</button>
                              </div>
                            </div>
                            {/* Price USD/XMR */}
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-[10px] opacity-60">XMR</label>
                                <input type="number" step="0.000001" value={editFields.price_xmr} onChange={(e) => handleEditXmrChange(parseFloat(e.target.value) || 0)} className="w-full border border-foreground bg-background px-2 py-1 text-xs font-mono focus:outline-none" />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] opacity-60">USD</label>
                                <input type="number" step="0.01" value={editFields.usd} onChange={(e) => handleEditUsdChange(e.target.value)} disabled={!rate} className="w-full border border-foreground bg-background px-2 py-1 text-xs font-mono focus:outline-none disabled:opacity-40" />
                              </div>
                            </div>
                            {/* Min Qty / Step / Unit */}
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-[10px] opacity-60">Min Qty</label>
                                <input type="number" min="1" value={editFields.min_quantity} onChange={(e) => setEditFields((f) => ({ ...f, min_quantity: parseInt(e.target.value) || 1 }))} className="w-full border border-foreground bg-background px-2 py-1 text-xs font-mono focus:outline-none" />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] opacity-60">Qty Step</label>
                                <input type="number" min="1" value={editFields.quantity_step} onChange={(e) => setEditFields((f) => ({ ...f, quantity_step: parseInt(e.target.value) || 1 }))} className="w-full border border-foreground bg-background px-2 py-1 text-xs font-mono focus:outline-none" />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] opacity-60">Unit</label>
                                <input value={editFields.unit_type} onChange={(e) => setEditFields((f) => ({ ...f, unit_type: e.target.value }))} className="w-full border border-foreground bg-background px-2 py-1 text-xs focus:outline-none" placeholder="pcs, g, ml..." />
                              </div>
                            </div>
                            {/* Gallery */}
                            <div>
                              <label className="text-[10px] opacity-60 block mb-1">GALLERY IMAGES</label>
                              <div className="flex gap-1 flex-wrap mb-1">
                                {gallery.map((img, i) => (
                                  <div key={i} className="relative w-10 h-10 border border-foreground group">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => removeGalleryImage(p.id, i)}
                                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground w-4 h-4 text-[8px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >×</button>
                                  </div>
                                ))}
                              </div>
                              <label className="text-[10px] border border-foreground px-2 py-1 cursor-pointer hover:bg-foreground hover:text-background transition-colors inline-block">
                                + ADD IMAGE
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addGalleryImage(p.id, f); }} />
                              </label>
                            </div>
                            {/* Save/Cancel */}
                            <div className="flex gap-2">
                              <button type="button" onClick={() => saveProduct(p.id)} className="text-xs border border-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition-colors">SAVE</button>
                              <button type="button" onClick={() => setEditingProduct(null)} className="text-xs opacity-40 hover:opacity-80">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="text-sm">
                                <span className="font-medium">{p.name}</span>
                                <span className="font-mono ml-2">{p.price_xmr} XMR</span>
                                {rate && <span className="text-xs opacity-50 ml-1">~${(p.price_xmr * rate).toFixed(2)}</span>}
                                <button onClick={() => startEditing(p)} className="ml-2 text-xs underline opacity-60">edit</button>
                              </div>
                              <button onClick={() => deleteProduct(p.id)} className="text-xs border border-foreground px-3 py-1 hover:bg-foreground hover:text-background transition-colors">DELETE</button>
                            </div>
                            {Array.isArray(p.categories) && p.categories.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {p.categories.map((cat: string, i: number) => (
                                  <span key={i} className="text-[10px] border border-foreground px-1.5 py-0.5 opacity-60">{cat}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs opacity-60 mt-1 line-clamp-2">{p.description}</p>
                            {gallery.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {gallery.map((img: string, i: number) => (
                                  <div key={i} className="w-8 h-8 border border-foreground/30">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  {(custKey || (o as any).sender_public_key) && !decryptedDetails[o.id] && (
                    <button onClick={() => decryptOrder(o.id, o.encrypted_details, custKey, (o as any).sender_public_key)} className="text-xs underline hover:opacity-60">
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
