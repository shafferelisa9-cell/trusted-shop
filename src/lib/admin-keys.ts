import { supabase } from '@/integrations/supabase/client';

// In-memory cache for admin public key to avoid repeated DB fetches
// and prevent transient network failures from breaking decryption
let cachedAdminPublicKey: string | null = null;

// Fetch admin public key from database (with cache)
export async function getAdminPublicKey(): Promise<string | null> {
  if (cachedAdminPublicKey) return cachedAdminPublicKey;
  try {
    const { data } = await supabase
      .from('admin_settings' as any)
      .select('public_key')
      .limit(1)
      .single();
    const key = (data as any)?.public_key ?? null;
    if (key) cachedAdminPublicKey = key;
    return key;
  } catch {
    return cachedAdminPublicKey;
  }
}

// Invalidate the cache (call after admin key changes)
export function invalidateAdminPublicKeyCache(): void {
  cachedAdminPublicKey = null;
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
  // Update cache
  cachedAdminPublicKey = key;
}
