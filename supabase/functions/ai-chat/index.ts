// Supabase Edge Function: ai-chat
//
// Garden-aware AI assistant. Proxies chat messages to Anthropic so the API
// key never ships in the client bundle. Requires an authenticated Supabase user.
//
// Deploy:   supabase functions deploy ai-chat
// Secret:   supabase secrets set ANTHROPIC_KEY=sk-ant-...
//
// Request body:
//   {
//     messages: Array<{ role: 'user' | 'assistant'; content: string }>,
//     gardenContext: {
//       climateZone: string;
//       province?: string;
//       hemisphere: 'norte' | 'sur';
//       gardenType: string;
//       currentMonth: number;  // 1-12
//       plantNames: string[];  // current plant names in garden
//     },
//     language?: string;  // 'es' | 'en' | 'ca' | 'eu' | 'gl' | 'val'
//   }
// Response: { reply: string } or { error, code } with 4xx/5xx status.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', en: 'English', ca: 'Catalan', eu: 'Basque', gl: 'Galician', val: 'Valencian',
};

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

interface GardenContext {
  climateZone?: string;
  province?: string;
  hemisphere?: string;
  gardenType?: string;
  currentMonth?: number;
  plantNames?: string[];
}

function buildSystemPrompt(lang: string, ctx: GardenContext): string {
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = ctx.currentMonth ? monthNames[ctx.currentMonth] ?? '' : '';
  const plants = ctx.plantNames?.length ? ctx.plantNames.join(', ') : 'none listed';
  const zone = ctx.climateZone ?? 'unknown';
  const province = ctx.province ? ` (${ctx.province})` : '';
  const hemisphere = ctx.hemisphere === 'sur' ? 'Southern Hemisphere' : 'Northern Hemisphere';
  const gardenType = ctx.gardenType ?? 'garden';

  return `You are Semilla, a friendly expert gardening assistant for home vegetable growers in Spain and Latin America. \
You have deep knowledge of organic growing, companion planting, pests, soil health, and seasonal planning.

User's garden context:
- Climate zone: ${zone}${province}
- Hemisphere: ${hemisphere}
- Garden type: ${gardenType}
- Current month: ${month}
- Plants currently growing: ${plants}

Guidelines:
- Respond ONLY in ${lang}. Never switch language.
- Keep answers concise and actionable (3-5 sentences max unless detail is needed).
- Reference the user's specific climate zone and month when relevant.
- When mentioning plants not in their garden, suggest they add them via the app.
- Be warm and encouraging. Growers appreciate positive reinforcement.
- Do NOT make up facts. If unsure, say so briefly.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'METHOD' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'Missing auth', code: 'AUTH' }, 401);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: 'Unauthorized', code: 'AUTH' }, 401);

  const apiKey = Deno.env.get('ANTHROPIC_KEY');
  if (!apiKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

  let body: {
    messages?: Array<{ role: string; content: string }>;
    gardenContext?: GardenContext;
    language?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body', code: 'BAD_REQUEST' }, 400);
  }

  const { messages, gardenContext = {}, language = 'es' } = body;
  if (!messages?.length) return json({ error: 'No messages', code: 'BAD_REQUEST' }, 400);

  const lang = LANG_NAMES[language] ?? 'Spanish';
  const system = buildSystemPrompt(lang, gardenContext);

  const validMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-10);

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system,
        messages: validMessages,
      }),
    });
  } catch (e) {
    return json({ error: `Upstream fetch failed: ${e}`, code: 'API_ERROR' }, 502);
  }

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text().catch(() => '');
    console.error('[ai-chat] anthropic error', anthropicRes.status, detail);
    return json({ error: `HTTP ${anthropicRes.status}`, code: 'API_ERROR' }, 502);
  }

  const data = await anthropicRes.json() as { content?: Array<{ text: string }> };
  const reply = data.content?.[0]?.text ?? '';
  if (!reply) return json({ error: 'Empty response from model', code: 'PARSE_ERROR' }, 502);

  return json({ reply });
});
