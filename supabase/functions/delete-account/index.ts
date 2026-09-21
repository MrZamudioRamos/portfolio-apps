// Supabase Edge Function: delete-account
//
// Permanently deletes the caller's account. Required by Apple App Store
// Guideline 5.1.1(v): apps with account creation must offer in-app account
// deletion (not just data deletion).
//
// All user-data tables reference profiles(id) ON DELETE CASCADE, and
// profiles.id references auth.users(id) ON DELETE CASCADE, so deleting the
// auth user cascades through profiles to every row. The client still clears
// local storage and signs out afterwards.
//
// Deploy: supabase functions deploy delete-account
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS, json, requireUser } from '../_shared/security.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'METHOD' }, 405);

  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

  // Storage objects are not removed by the auth.users cascade. Clean them up
  // first so account deletion really removes all user data.
  const admin = createClient(url, serviceKey);
  const bucket = admin.storage.from('photos');
  const paths: string[] = [];
  for (let offset = 0; offset < 10_000; offset += 1_000) {
    const { data, error } = await bucket.list(user.id, { limit: 1_000, offset });
    if (error) {
      console.error('[delete-account] storage list failed', error.message);
      return json({ error: 'Delete failed', code: 'DELETE_FAILED' }, 500);
    }
    paths.push(...(data ?? []).filter((item) => item.name && !item.id?.startsWith('folder-')).map((item) => `${user.id}/${item.name}`));
    if (!data || data.length < 1_000) break;
  }
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await bucket.remove(paths.slice(index, index + 100));
    if (error) {
      console.error('[delete-account] storage remove failed', error.message);
      return json({ error: 'Delete failed', code: 'DELETE_FAILED' }, 500);
    }
  }

  // Delete the auth user with the service role; cascade removes all DB data.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error('[delete-account] deleteUser failed', delErr);
    return json({ error: 'Delete failed', code: 'DELETE_FAILED' }, 500);
  }

  return json({ ok: true });
});
