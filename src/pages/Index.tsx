import { useState, useEffect } from 'react';
import { getUserId, setUserId, getPrivateKey, setPrivateKey } from '@/lib/cookies';
import { generateKeyPair } from '@/lib/e2e-crypto';
import { supabase } from '@/integrations/supabase/client';
import Store from './Store';

const Index = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      try {
        if (!getUserId()) {
          console.log('Generating ECDH keypair...');
          const { publicKey, privateKey } = await generateKeyPair();
          console.log('Keypair generated, saving...');
          setPrivateKey(privateKey);
          
          const { data, error: dbError } = await supabase
            .from('users')
            .insert({ public_key: publicKey })
            .select('id')
            .single();

          if (dbError) {
            console.error('DB insert failed:', dbError);
            setError('Failed to initialize user');
            return;
          }
          if (data) setUserId(data.id);
        }
        setReady(true);
      } catch (err) {
        console.error('User init failed:', err);
        setError('Failed to initialize encryption keys');
      }
    };
    
    initUser();
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

  return <Store />;
};

export default Index;
