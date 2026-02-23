import { useState, useEffect } from 'react';
import { getEntryCode, getUserId, setUserId } from '@/lib/cookies';
import { getPrivateKey, setPrivateKey } from '@/lib/cookies';
import { generateKeyPair } from '@/lib/pgp';
import { supabase } from '@/integrations/supabase/client';
import EntryGate from './EntryGate';
import Store from './Store';

const Index = () => {
  const [hasCode, setHasCode] = useState(!!getEntryCode());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasCode) return;
    const initUser = async () => {
      if (!getUserId()) {
        const { publicKey, privateKey } = await generateKeyPair();
        setPrivateKey(privateKey);
        const { data } = await supabase
          .from('users')
          .insert({ public_key: publicKey })
          .select('id')
          .single();
        if (data) setUserId(data.id);
      }
      setReady(true);
    };
    initUser();
  }, [hasCode]);

  if (!hasCode) {
    return <EntryGate onEnter={() => setHasCode(true)} />;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm opacity-40">Initializing...</p>
      </div>
    );
  }

  return <Store />;
};

export default Index;
