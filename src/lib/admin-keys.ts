import { supabase } from '@/integrations/supabase/client';

// Fetch admin public key from database
export async function getAdminPublicKey(): Promise<string | null> {
  const { data } = await supabase
    .from('admin_settings' as any)
    .select('public_key')
    .limit(1)
    .single();
  return (data as any)?.public_key ?? null;
}

// Save admin public key to database (upsert)
export async function setAdminPublicKey(key: string): Promise<void> {
  // Try to get existing row
  const { data: existing } = await supabase
    .from('admin_settings' as any)
    .select('id')
    .limit(1)
    .single();

  if ((existing as any)?.id) {
    await supabase
      .from('admin_settings' as any)
      .update({ public_key: key, updated_at: new Date().toISOString() } as any)
      .eq('id', (existing as any).id);
  } else {
    await supabase
      .from('admin_settings' as any)
      .insert({ public_key: key } as any);
  }
}
