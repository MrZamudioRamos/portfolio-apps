import { getSupabase } from './client';

export async function pullAll<TRow>(tableName: string, userId: string): Promise<TRow[]> {
  const { data, error } = await getSupabase()
    .from(tableName)
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as TRow[];
}

export async function upsertAll<TRow extends object>(tableName: string, rows: TRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await getSupabase().from(tableName).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteRow(tableName: string, id: string): Promise<void> {
  const { error } = await getSupabase().from(tableName).delete().eq('id', id);
  if (error) throw error;
}
