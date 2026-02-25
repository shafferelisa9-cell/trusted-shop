import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useXmrRate() {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      const { data, error } = await (supabase as any)
        .from('settings')
        .select('value')
        .eq('key', 'xmr_usd_rate')
        .single();
      if (data?.value && !error) setRate(parseFloat(data.value));
    };
    fetchRate();
  }, []);

  const xmrToUsd = (xmr: number) => (rate ? xmr * rate : null);

  return { rate, xmrToUsd };
}
