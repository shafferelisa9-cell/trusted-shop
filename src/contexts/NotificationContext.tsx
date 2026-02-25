import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getUserId } from '@/lib/cookies';

interface NotificationContextType {
  adminUnreadOrders: number;
  adminUnreadMessages: number;
  userUnreadMessages: number;
  markAdminOrdersSeen: () => void;
  markAdminMessagesSeen: () => void;
  markUserMessagesSeen: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

const LS_ADMIN_ORDERS = 'notif_admin_last_seen_orders';
const LS_ADMIN_MESSAGES = 'notif_admin_last_seen_messages';
const LS_USER_MESSAGES = 'notif_user_last_seen_messages';

const getTs = (key: string) => localStorage.getItem(key) || '1970-01-01T00:00:00Z';
const setTs = (key: string) => localStorage.setItem(key, new Date().toISOString());

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useAuth();
  const [adminUnreadOrders, setAdminUnreadOrders] = useState(0);
  const [adminUnreadMessages, setAdminUnreadMessages] = useState(0);
  const [userUnreadMessages, setUserUnreadMessages] = useState(0);

  const fetchAdminCounts = useCallback(async () => {
    if (!isAdmin) return;
    const lastOrders = getTs(LS_ADMIN_ORDERS);
    const lastMessages = getTs(LS_ADMIN_MESSAGES);

    const [{ count: orderCount }, { count: msgCount }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).gt('created_at', lastOrders),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender', 'customer').gt('created_at', lastMessages),
    ]);
    setAdminUnreadOrders(orderCount || 0);
    setAdminUnreadMessages(msgCount || 0);
  }, [isAdmin]);

  const fetchUserCounts = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    const lastMessages = getTs(LS_USER_MESSAGES);

    // Get user's order IDs
    const { data: orders } = await supabase.from('orders').select('id').eq('user_id', userId);
    if (!orders || orders.length === 0) { setUserUnreadMessages(0); return; }

    const orderIds = orders.map((o) => o.id);
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender', 'admin')
      .in('order_id', orderIds)
      .gt('created_at', lastMessages);
    setUserUnreadMessages(count || 0);
  }, []);

  const markAdminOrdersSeen = useCallback(() => { setTs(LS_ADMIN_ORDERS); setAdminUnreadOrders(0); }, []);
  const markAdminMessagesSeen = useCallback(() => { setTs(LS_ADMIN_MESSAGES); setAdminUnreadMessages(0); }, []);
  const markUserMessagesSeen = useCallback(() => { setTs(LS_USER_MESSAGES); setUserUnreadMessages(0); }, []);

  // Initial fetch
  useEffect(() => {
    fetchAdminCounts();
    fetchUserCounts();
  }, [fetchAdminCounts, fetchUserCounts]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchAdminCounts();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        if (payload.new?.sender === 'customer') fetchAdminCounts();
        if (payload.new?.sender === 'admin') fetchUserCounts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAdminCounts, fetchUserCounts]);

  return (
    <NotificationContext.Provider value={{
      adminUnreadOrders, adminUnreadMessages, userUnreadMessages,
      markAdminOrdersSeen, markAdminMessagesSeen, markUserMessagesSeen,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
