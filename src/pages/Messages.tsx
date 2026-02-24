import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage, decryptMessage, generateKeyPair } from '@/lib/e2e-crypto';
import { getPrivateKey, setPrivateKey, getUserId, setUserId } from '@/lib/cookies';
import { getAdminPublicKey } from '@/lib/admin-keys';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface Msg {
  id: string;
  content: string;
  sender: string;
  created_at: string;
  sender_public_key?: string;
  decrypted?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', userId)
      .order('created_at', { ascending: true });

    if (data) {
      const privateKey = getPrivateKey();
      const adminPubKey = await getAdminPublicKey();
      if (privateKey) {
        const decrypted = await Promise.all(
          data.map(async (msg: any) => {
            try {
              // For admin messages: use sender_public_key stored at send time (the admin's public key)
              // For customer's own messages: use sender_public_key if available (the admin's public key
              // used at encryption time), fallback to current admin key from DB
              let pubKeyForDecrypt: string | null;
              if (msg.sender === 'admin') {
                pubKeyForDecrypt = msg.sender_public_key || adminPubKey;
              } else {
                // Customer's own message: was encrypted with ECDH(customer_priv, admin_pub)
                // We need the same admin_pub that was used at encryption time
                // sender_public_key for customer msgs stores the customer's own pub key,
                // so we use the current admin key (stable if admin doesn't regenerate)
                pubKeyForDecrypt = adminPubKey;
              }
              if (!pubKeyForDecrypt) return { ...msg, decrypted: '[admin key not set]' };
              const d = await decryptMessage(msg.encrypted_content, privateKey, pubKeyForDecrypt);
              return { ...msg, decrypted: d };
            } catch {
              return { ...msg, decrypted: '[encrypted]' };
            }
          })
        );
        setMessages(decrypted);
      } else {
        setMessages(data.map((m: any) => ({ ...m, decrypted: adminPubKey ? '[no private key]' : '[admin key not set]' })));
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Guard against re-initialization on auth token refresh
    if (initRef.current) {
      fetchMessages();
      return;
    }

    const initKeys = async () => {
      const currentUserId = getUserId();
      const currentPrivateKey = getPrivateKey();

      if (currentUserId && currentPrivateKey) {
        // Keys exist - just link auth_id, don't touch keys
        await supabase
          .from('users')
          .update({ auth_id: user.id } as any)
          .eq('id', currentUserId);
      } else if (currentUserId && !currentPrivateKey) {
        // User ID exists but private key is lost (localStorage cleared)
        // Check if DB already has a public key - if so, keys were previously set up
        const { data: existingUser } = await supabase
          .from('users')
          .select('public_key')
          .eq('id', currentUserId)
          .single();

        if (existingUser?.public_key) {
          // DB has an existing public key but local private key is gone
          // We must regenerate - old messages will be unreadable (E2EE limitation)
          // but new messages will work
          const { publicKey, privateKey } = await generateKeyPair();
          setPrivateKey(privateKey);
          await supabase
            .from('users')
            .update({ public_key: publicKey, auth_id: user.id } as any)
            .eq('id', currentUserId);
        } else {
          // No key in DB either - first time setup
          const { publicKey, privateKey } = await generateKeyPair();
          setPrivateKey(privateKey);
          await supabase
            .from('users')
            .update({ public_key: publicKey, auth_id: user.id } as any)
            .eq('id', currentUserId);
        }
      } else {
        // No user_id cookie - look up by auth_id or create new user
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, public_key')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (existingUser) {
          setUserId(existingUser.id);
          if (!getPrivateKey()) {
            // User exists in DB but no local private key
            const { publicKey, privateKey } = await generateKeyPair();
            setPrivateKey(privateKey);
            await supabase
              .from('users')
              .update({ public_key: publicKey } as any)
              .eq('id', existingUser.id);
          }
        } else {
          // Brand new user
          const { publicKey, privateKey } = await generateKeyPair();
          setPrivateKey(privateKey);
          const { data } = await supabase
            .from('users')
            .insert({ public_key: publicKey, auth_id: user.id } as any)
            .select('id')
            .single();
          if (data) setUserId(data.id);
        }
      }
      initRef.current = true;
      setReady(true);
    };

    initKeys().then(fetchMessages);

    const channel = supabase
      .channel('user-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const privateKey = getPrivateKey();
    const adminPubKey = await getAdminPublicKey();
    const userId = getUserId();
    if (!privateKey || !adminPubKey || !userId) {
      toast({ title: 'Encryption not ready', description: 'Please refresh the page and try again.', variant: 'destructive' });
      return;
    }

    // Get customer's own public key to store with message
    const { data: userData } = await supabase.from('users').select('public_key').eq('id', userId).single();
    const myPublicKey = userData?.public_key;

    setSending(true);
    try {
      const encrypted = await encryptMessage(input, privateKey, adminPubKey);
      const { error } = await supabase.from('messages').insert({
        order_id: userId,
        encrypted_content: encrypted,
        sender: 'customer',
        sender_public_key: myPublicKey || null,
      } as any);
      if (error) {
        toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
        return;
      }
      setInput('');
      fetchMessages();
    } catch (err) {
      console.error('Send failed:', err);
      toast({ title: 'Failed to send', description: 'Encryption or network error', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-sm">Please <Link to="/auth" className="underline hover:opacity-60">log in</Link> to send messages.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-sm font-medium tracking-widest">MESSAGES</h1>
        <p className="text-xs opacity-60">All messages are end-to-end encrypted. Only you and the admin can read them.</p>

        <div className="border border-foreground flex flex-col h-96">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm ${msg.sender === 'admin' ? 'text-right' : 'text-left'}`}
              >
                <span className="text-xs opacity-40 uppercase">{msg.sender}</span>
                <p className="mt-0.5">{msg.decrypted || '[encrypted]'}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-sm opacity-40 text-center py-8">
                {!ready ? 'Initializing encryption...' : 'No messages yet. Send a message to the store.'}
              </p>
            )}
          </div>
          <div className="border-t border-foreground flex">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type an encrypted message..."
              className="flex-1 px-4 py-3 text-sm bg-background focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="border-l border-foreground px-6 text-sm font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
            >
              SEND
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
