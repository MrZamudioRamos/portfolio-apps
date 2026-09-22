import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function requireUser(req: Request): Promise<User | Response> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+$/i.test(authHeader)) return json({ error: 'Unauthorized', code: 'AUTH' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: 'Unauthorized', code: 'AUTH' }, 401);
  return user;
}

export async function enforceHourlyLimit(userId: string, limit: number): Promise<Response | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);
  const serviceClient = createClient(url, serviceRoleKey);
  const { data: callCount, error } = await serviceClient.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_hour_bucket: hourBucket.toISOString(),
    p_limit: limit,
  });

  // AI spend protection fails closed: a broken limiter must not become an
  // unlimited paid upstream proxy.
  if (error || typeof callCount !== 'number') {
    console.error('[security] rate limit check failed', error?.message ?? 'invalid counter');
    return json({ error: 'Rate limit unavailable', code: 'RATE_LIMIT_UNAVAILABLE' }, 503);
  }
  if (callCount > limit) return json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT' }, 429);
  return null;
}

export async function enforceDailyAIQuota(userId: string): Promise<Response | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return json({ error: 'Quota unavailable', code: 'QUOTA_UNAVAILABLE' }, 503);

  const serviceClient = createClient(url, serviceRoleKey);
  const dayBucket = new Date().toISOString().slice(0, 10);
  const { data: quota, error } = await serviceClient.rpc('consume_ai_daily_quota', {
    p_user_id: userId,
    p_day_bucket: dayBucket,
  });

  // Fail closed: a database or quota error must never turn the paid proxy into
  // an unmetered endpoint.
  if (error || (quota !== 'allowed' && quota !== 'user_limit' && quota !== 'global_limit')) {
    console.error('[security] daily AI quota check failed', error?.message ?? 'invalid quota result');
    return json({ error: 'Quota unavailable', code: 'QUOTA_UNAVAILABLE' }, 503);
  }
  if (quota === 'user_limit') return json({ error: 'Daily analysis limit reached', code: 'RATE_LIMIT' }, 429);
  if (quota === 'global_limit') return json({ error: 'Daily beta allowance reached', code: 'DAILY_BUDGET' }, 429);
  return null;
}

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_IMAGE_BASE64_CHARS = 8_000_000;

export function validateImage(base64: unknown, mediaType: unknown): string | null {
  if (typeof base64 !== 'string' || base64.length === 0 || base64.length > MAX_IMAGE_BASE64_CHARS) {
    return 'Image too large or missing';
  }
  if (typeof mediaType !== 'string' || !ALLOWED_IMAGE_TYPES.has(mediaType.toLowerCase())) {
    return 'Unsupported image type';
  }
  return null;
}

export function clampText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}
