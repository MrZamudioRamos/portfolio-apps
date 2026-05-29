// Supabase Edge Function: ai-vision
//
// Proxies plant-vision calls to Anthropic so the API key never ships in the
// client bundle. Requires an authenticated Supabase user (rate-limit foundation)
// and keeps the prompt logic server-side so it can be tuned without an app
// release.
//
// Deploy:   supabase functions deploy ai-vision
// Secret:   supabase secrets set ANTHROPIC_KEY=sk-ant-...
//   (SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.)
//
// Request body:
//   { mode: 'identify-pest', base64, mediaType, language, cropName }
//   { mode: 'scan-plant',    base64, mediaType, language, cropNames: {id:name} }
// Response: the parsed JSON result, or { error, code } with a 4xx/5xx status.

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

function buildPestPrompt(lang: string): string {
  return `You are a plant pathology expert. Analyze the plant image and respond ONLY with valid JSON (no other text):
{
  "detected": true or false,
  "name": "problem name in ${lang}",
  "type": one of: "plaga", "enfermedad", "deficiencia", "saludable",
  "confidence": one of: "alta", "media", "baja",
  "description": "1-2 sentences in ${lang}",
  "symptoms": "visible symptoms in ${lang}",
  "treatments": [
    {"type": one of: "organico","preventivo","quimico", "name": "...", "instructions": "..."}
  ]
}
If plant is healthy: detected=false, type="saludable", symptoms="", treatments=[].
All text must be in ${lang}.`;
}

function buildScanPrompt(lang: string, cropNames: Record<string, string>): string {
  const cropList = Object.entries(cropNames).map(([id, name]) => `${id}: ${name}`).join('\n');
  return `You are a botanist expert. Analyze the plant image and identify it.
Available crops in our database (cropId: english_name):
${cropList}

Respond ONLY with valid JSON (no other text):
{
  "identified": true or false,
  "cropId": "exact_id_from_list or null if not in list",
  "cropName": "plant name in ${lang}",
  "growthStage": one of: "seedling", "vegetative", "flowering", "fruiting", "dormant",
  "notes": "1-2 sentences about visible plant health and observations in ${lang}",
  "confidence": one of: "alta", "media", "baja"
}
If you cannot identify the plant: identified=false, cropId=null, confidence="baja".
All text fields (cropName, notes) must be in ${lang}.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'METHOD' }, 405);

  // Require an authenticated Supabase user.
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
    mode?: string;
    base64?: string;
    mediaType?: string;
    language?: string;
    cropName?: string;
    cropNames?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body', code: 'BAD_REQUEST' }, 400);
  }

  const { mode, base64, mediaType, language } = body;
  if (!base64 || !mediaType) return json({ error: 'Missing image', code: 'BAD_REQUEST' }, 400);
  const lang = LANG_NAMES[language ?? 'es'] ?? 'Spanish';

  let system: string;
  let userText: string;
  let maxTokens: number;
  if (mode === 'identify-pest') {
    system = buildPestPrompt(lang);
    userText = `Analyze this ${body.cropName ?? 'plant'} for pests, diseases, or deficiencies.`;
    maxTokens = 1024;
  } else if (mode === 'scan-plant') {
    system = buildScanPrompt(lang, body.cropNames ?? {});
    userText = 'Identify this plant and match it to our database.';
    maxTokens = 512;
  } else {
    return json({ error: 'Unknown mode', code: 'BAD_REQUEST' }, 400);
  }

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
        max_tokens: maxTokens,
        system,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: userText },
          ],
        }],
      }),
    });
  } catch (e) {
    return json({ error: `Upstream fetch failed: ${e}`, code: 'API_ERROR' }, 502);
  }

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text().catch(() => '');
    console.error('[ai-vision] anthropic error', anthropicRes.status, detail);
    return json({ error: `HTTP ${anthropicRes.status}`, code: 'API_ERROR' }, 502);
  }

  const data = await anthropicRes.json() as { content?: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error('[ai-vision] could not parse JSON:', text);
    return json({ error: 'Could not parse model output', code: 'PARSE_ERROR' }, 502);
  }

  try {
    return json(JSON.parse(match[0]));
  } catch {
    return json({ error: 'Invalid JSON from model', code: 'PARSE_ERROR' }, 502);
  }
});
