import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encryptMessage, decryptMessage } from '@/lib/e2e-crypto';
import { getAdminPublicKey } from '@/lib/admin-keys';
import { getPrivateKey, getAdminPrivateKey } from '@/lib/cookies';

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
  decrypted?: string;
}

const Chat = ({ orderId, isAdmin = false, customerPublicKey }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const getKeys = async () => {
    const privateKey = isAdmin ? getAdminPrivateKey() : getPrivateKey();
    const counterpartPublicKey = isAdmin ? customerPublicKey : await getAdminPublicKey();
    return { privateKey, counterpartPublicKey };
  };

  const decryptAll = async (msgs: Message[]) => {
    const { privateKey, counterpartPublicKey } = await getKeys();
    if (!privateKey || !counterpartPublicKey) return msgs;

    return Promise.all(
      msgs.map(async (msg) => {
        try {
          const decrypted = await decryptMessage(msg.encrypted_content, privateKey, counterpartPublicKey);
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
      const { privateKey, counterpartPublicKey } = await getKeys();
      if (!privateKey || !counterpartPublicKey) throw new Error('Missing keys');

      const encrypted = await encryptMessage(input, privateKey, counterpartPublicKey);

      await supabase.from('messages').insert({
        order_id: orderId,
        encrypted_content: encrypted,
        sender: isAdmin ? 'admin' : 'customer',
      });

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
