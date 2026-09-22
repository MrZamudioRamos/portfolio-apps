// Supabase Edge Function: ai-proxy
//
// Generic server-side proxy for Anthropic API calls. The key never ships in
// the client bundle. Shares the 3-per-user / 25-total daily beta quota.
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

import { CORS, clampText, enforceDailyAIQuota, json, requireUser } from '../_shared/security.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS_CAP = 2048;
const DEFAULT_MAX_TOKENS = 512;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'METHOD' }, 405);

  // ── 1. Auth: verify Supabase JWT ──────────────────────────────────────────
  const user = await requireUser(req);
  if (user instanceof Response) return user;

  // ── 2. Require provider configuration before reading the request ──────────
  const apiKey = Deno.env.get('ANTHROPIC_KEY');
  if (!apiKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

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
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return json({ error: 'Invalid messages', code: 'BAD_REQUEST' }, 400);
  }

  const validMessages = messages
    .filter((m) =>
      m && (m.role === 'user' || m.role === 'assistant')
      && typeof m.content === 'string'
      && m.content.trim().length > 0
      && m.content.length <= 4000
    )
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.trim() }))
    .slice(-20);
  if (!validMessages.length) return json({ error: 'No valid messages', code: 'BAD_REQUEST' }, 400);

  const quotaResponse = await enforceDailyAIQuota(user.id);
  if (quotaResponse) return quotaResponse;

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
  const safeSystem = clampText(system, 8000);
  if (safeSystem) anthropicBody.system = safeSystem;

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
