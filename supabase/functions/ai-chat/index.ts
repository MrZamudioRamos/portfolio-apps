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

import { CORS, clampText, enforceDailyAIQuota, json, requireUser } from '../_shared/security.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', en: 'English', ca: 'Catalan', eu: 'Basque', gl: 'Galician', val: 'Valencian',
};

interface GardenContext {
  climateZone?: string;
  province?: string;
  hemisphere?: string;
  gardenType?: string;
  currentMonth?: number;
  plantNames?: string[];
  diagnosisFollowUps?: Array<{
    plantName: string;
    status: string;
    summary: string;
    nextStep: string;
    date: string;
  }>;
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
  const followUps = ctx.diagnosisFollowUps?.length
    ? ctx.diagnosisFollowUps.map((item) => `- ${item.date} · ${item.plantName} · ${item.status}: ${item.summary}${item.nextStep ? ` Next step: ${item.nextStep}` : ''}`).join('\n')
    : 'none recorded';

  return `You are Semilla, a friendly expert gardening assistant for home vegetable growers in Spain and Latin America. \
You have deep knowledge of organic growing, companion planting, pests, soil health, and seasonal planning.

User's garden context:
- Climate zone: ${zone}${province}
- Hemisphere: ${hemisphere}
- Garden type: ${gardenType}
- Current month: ${month}
- Plants currently growing: ${plants}
- Recent diagnosis follow-ups:\n${followUps}

Guidelines:
- Respond ONLY in ${lang}. Never switch language.
- Keep answers concise and actionable (3-5 sentences max unless detail is needed).
- Reference the user's specific climate zone and month when relevant.
- When mentioning plants not in their garden, suggest they add them via the app.
- Be warm and encouraging. Growers appreciate positive reinforcement.
- When a user asks about plant health or a previous diagnosis, use the recent follow-up history above and refer to the recorded result. If the status is uncertain, say so and recommend a new well-framed photo.
- Do NOT make up facts. If unsure, say so briefly.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'METHOD' }, 405);

  const user = await requireUser(req);
  if (user instanceof Response) return user;

  // ── 2. Parse and validate before reserving one daily beta slot. ────────────
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
    .slice(-10);
  if (!validMessages.length) return json({ error: 'No valid messages', code: 'BAD_REQUEST' }, 400);

  const quotaResponse = await enforceDailyAIQuota(user.id);
  if (quotaResponse) return quotaResponse;

  const safeContext: GardenContext = {
    climateZone: clampText(gardenContext?.climateZone, 80) ?? undefined,
    province: clampText(gardenContext?.province, 80) ?? undefined,
    hemisphere: clampText(gardenContext?.hemisphere, 20) ?? undefined,
    gardenType: clampText(gardenContext?.gardenType, 80) ?? undefined,
    currentMonth: Number.isInteger(gardenContext?.currentMonth) && gardenContext.currentMonth >= 1 && gardenContext.currentMonth <= 12
      ? gardenContext.currentMonth : undefined,
    plantNames: Array.isArray(gardenContext?.plantNames)
      ? gardenContext.plantNames.filter((name): name is string => typeof name === 'string').map((name) => name.trim()).filter(Boolean).slice(0, 50)
      : [],
    diagnosisFollowUps: Array.isArray(gardenContext?.diagnosisFollowUps)
      ? gardenContext.diagnosisFollowUps.slice(0, 20).map((item) => ({
          plantName: clampText(item?.plantName, 100) ?? 'Planta',
          status: clampText(item?.status, 60) ?? 'incierto',
          summary: clampText(item?.summary, 500) ?? '',
          nextStep: clampText(item?.nextStep, 300) ?? '',
          date: clampText(item?.date, 40) ?? '',
        }))
      : [],
  };

  const lang = LANG_NAMES[language] ?? 'Spanish';
  const system = buildSystemPrompt(lang, safeContext);

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
