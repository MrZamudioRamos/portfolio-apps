import { getSupabase } from './client';
import type { RemoteCrop } from './types';

/** Public, read-only reference data. RLS on `crops` allows active rows only. */
export async function pullCropCatalog(): Promise<RemoteCrop[]> {
  const { data, error } = await getSupabase()
    .from('crops')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RemoteCrop[];
}
