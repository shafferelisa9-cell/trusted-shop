import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getUserId, setUserId, getPrivateKey, setPrivateKey } from '@/lib/cookies';
import { generateKeyPair } from '@/lib/e2e-crypto';
import { supabase } from '@/integrations/supabase/client';

interface KeyContextType {
  ready: boolean;
}

const KeyContext = createContext<KeyContextType>({ ready: false });

export const useKeys = () => useContext(KeyContext);

export const KeyProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (getUserId() && getPrivateKey()) {
          setReady(true);
          return;
        }

        const { publicKey, privateKey } = await generateKeyPair();
        setPrivateKey(privateKey);

        const { data, error: dbError } = await supabase
          .from('users')
          .insert({ public_key: publicKey })
          .select('id')
          .single();

        if (dbError) {
          console.error('Key init DB error:', dbError);
          setError('Failed to initialize encryption');
          return;
        }
        if (data) setUserId(data.id);
        setReady(true);
      } catch (err) {
        console.error('Key init failed:', err);
        setError('Failed to initialize encryption keys');
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => { setError(null); setReady(false); }}
            className="text-sm underline hover:opacity-60"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm opacity-40">Initializing encryption...</p>
      </div>
    );
  }

  return <KeyContext.Provider value={{ ready }}>{children}</KeyContext.Provider>;
};
