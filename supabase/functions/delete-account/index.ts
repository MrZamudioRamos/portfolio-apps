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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'METHOD' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'Missing auth', code: 'AUTH' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

  // Identify the caller from their JWT (anon client scoped to their token).
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user) return json({ error: 'Unauthorized', code: 'AUTH' }, 401);

  // Delete the auth user with the service role; cascade removes all their data.
  const admin = createClient(url, serviceKey);
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error('[delete-account] deleteUser failed', delErr);
    return json({ error: 'Delete failed', code: 'DELETE_FAILED' }, 500);
  }

  return json({ ok: true });
});
