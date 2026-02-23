import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage, decryptMessage } from '@/lib/e2e-crypto';
import { getAdminPublicKey } from '@/lib/admin-keys';
import { getPrivateKey, getAdminPrivateKey, getUserId } from '@/lib/cookies';

interface ChatProps {
  orderId: string;
  isAdmin?: boolean;
  customerPublicKey?: string;
}

interface Message {
  id: string;
  encrypted_content: string;
  sender: string;
  created_at: string;
  sender_public_key?: string;
  decrypted?: string;
}

const Chat = ({ orderId, isAdmin = false, customerPublicKey }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const decryptAll = async (msgs: Message[]) => {
    const privateKey = isAdmin ? getAdminPrivateKey() : getPrivateKey();
    const adminPubKey = await getAdminPublicKey();
    if (!privateKey) return msgs;

    return Promise.all(
      msgs.map(async (msg) => {
        try {
          let pubKeyForDecrypt: string | null = null;
          if (isAdmin) {
            // Admin decrypting: customer msgs use sender_public_key, admin msgs use admin's own key (self)
            if (msg.sender === 'customer') {
              pubKeyForDecrypt = msg.sender_public_key || customerPublicKey || null;
            } else {
              // Admin's own messages - need customer pub key to derive same shared secret
              pubKeyForDecrypt = customerPublicKey || null;
            }
          } else {
            // Customer decrypting: admin msgs use sender_public_key, customer msgs use admin pub
            if (msg.sender === 'admin') {
              pubKeyForDecrypt = msg.sender_public_key || adminPubKey;
            } else {
              pubKeyForDecrypt = adminPubKey;
            }
          }
          if (!pubKeyForDecrypt) return { ...msg, decrypted: '[missing key]' };
          const decrypted = await decryptMessage(msg.encrypted_content, privateKey, pubKeyForDecrypt);
          return { ...msg, decrypted };
        } catch {
          return { ...msg, decrypted: '[unable to decrypt]' };
        }
      })
    );
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (data) {
      const decrypted = await decryptAll(data);
      setMessages(decrypted);
    }
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`messages-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);

    try {
      const privateKey = isAdmin ? getAdminPrivateKey() : getPrivateKey();
      const adminPubKey = await getAdminPublicKey();
      const counterpartPublicKey = isAdmin ? customerPublicKey : adminPubKey;
      if (!privateKey || !counterpartPublicKey) throw new Error('Missing keys');

      const encrypted = await encryptMessage(input, privateKey, counterpartPublicKey);

      // Get sender's public key to store with message
      let senderPubKey: string | null = null;
      if (isAdmin) {
        senderPubKey = adminPubKey;
      } else {
        const userId = getUserId();
        if (userId) {
          const { data } = await supabase.from('users').select('public_key').eq('id', userId).single();
          senderPubKey = data?.public_key || null;
        }
      }

      await supabase.from('messages').insert({
        order_id: orderId,
        encrypted_content: encrypted,
        sender: isAdmin ? 'admin' : 'customer',
        sender_public_key: senderPubKey,
      } as any);

      setInput('');
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-foreground flex flex-col h-80">
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
          <p className="text-sm opacity-40 text-center py-8">No messages yet</p>
        )}
      </div>
      <div className="border-t border-foreground flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
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
  );
};

export default Chat;
