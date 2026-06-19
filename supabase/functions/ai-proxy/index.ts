// Supabase Edge Function: ai-proxy
//
// Generic server-side proxy for Anthropic API calls. The key never ships in
// the client bundle. Enforces 20 calls per authenticated user per hour.
//
// Deploy:   supabase functions deploy ai-proxy
// Secret:   supabase secrets set ANTHROPIC_KEY=sk-ant-...
//   (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are auto-injected.)
//
// Test locally:
//   supabase functions serve ai-proxy --env-file ./supabase/.env.local
//   curl -i -X POST 'http://127.0.0.1:54321/functions/v1/ai-proxy' \
//     -H 'Authorization: Bearer <supabase-jwt>' \
//     -H 'Content-Type: application/json' \
//     -d '{"messages":[{"role":"user","content":"Hola"}]}'
//
// Request body:
//   {
//     messages:   Array<{ role: 'user' | 'assistant'; content: string }>,
//     system?:    string,
//     max_tokens?: number   (default 512, capped at 2048)
//   }
// Response: { reply: string } or { error: string, code: string } with status.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const HOURLY_LIMIT = 20;
const MAX_TOKENS_CAP = 2048;
const DEFAULT_MAX_TOKENS = 512;

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

  // ── 1. Auth: verify Supabase JWT ──────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'Missing auth', code: 'AUTH' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: 'Unauthorized', code: 'AUTH' }, 401);

  // ── 2. Rate limiting: max HOURLY_LIMIT calls per user per hour ────────────
  const apiKey = Deno.env.get('ANTHROPIC_KEY');
  if (!apiKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);

  const { data: callCount, error: rateErr } = await serviceClient.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_hour_bucket: hourBucket.toISOString(),
    p_limit: HOURLY_LIMIT,
  });

  if (rateErr) {
    // Fail open: if the rate-limit table has a problem, log and continue.
    console.error('[ai-proxy] rate limit check failed', rateErr.message);
  } else if (callCount > HOURLY_LIMIT) {
    return json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT' }, 429);
  }

  // ── 3. Parse request body ─────────────────────────────────────────────────
  let body: {
    messages?: Array<{ role: string; content: string }>;
    system?: string;
    max_tokens?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400);
  }

  const { messages, system, max_tokens } = body;
  if (!messages?.length) return json({ error: 'messages required', code: 'BAD_REQUEST' }, 400);

  const validMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-20);
  if (!validMessages.length) return json({ error: 'No valid messages', code: 'BAD_REQUEST' }, 400);

  const maxTokens = Math.min(
    typeof max_tokens === 'number' && max_tokens > 0 ? max_tokens : DEFAULT_MAX_TOKENS,
    MAX_TOKENS_CAP,
  );

  // ── 4. Proxy to Anthropic ─────────────────────────────────────────────────
  const anthropicBody: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: validMessages,
  };
  if (system) anthropicBody.system = system;

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicBody),
    });
  } catch (e) {
    console.error('[ai-proxy] upstream fetch failed', e);
    return json({ error: 'Upstream unreachable', code: 'API_ERROR' }, 502);
  }

  if (anthropicRes.status === 429) {
    const detail = await anthropicRes.text().catch(() => '');
    console.error('[ai-proxy] anthropic rate limit', detail);
    return json({ error: 'Upstream rate limited', code: 'RATE_LIMIT' }, 429);
  }

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text().catch(() => '');
    console.error('[ai-proxy] anthropic error', anthropicRes.status, detail);
    return json({ error: 'Upstream error', code: 'API_ERROR' }, 502);
  }

  const data = await anthropicRes.json() as { content?: Array<{ text: string }> };
  const reply = data.content?.[0]?.text ?? '';
  if (!reply) return json({ error: 'Empty model response', code: 'PARSE_ERROR' }, 502);

  return json({ reply });
});
