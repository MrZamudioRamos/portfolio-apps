// Supabase Edge Function: ai-vision
//
// Proxies plant-vision calls to Anthropic so the API key never ships in the
// client bundle. Requires an authenticated user and the shared daily beta quota.
// and keeps the prompt logic server-side so it can be tuned without an app
// release.
//
// Deploy:   supabase functions deploy ai-vision
// Secret:   supabase secrets set ANTHROPIC_KEY=sk-ant-...
//   (SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.)
//
// Request body:
//   { mode: 'identify-pest', base64, mediaType, language, cropName }
//   { mode: 'compare-diagnosis', beforeBase64, beforeMediaType, afterBase64, afterMediaType, language, plantName }
//   { mode: 'scan-plant',    base64, mediaType, language, cropNames: {id:name} }
// Response: the parsed JSON result, or { error, code } with a 4xx/5xx status.

import { CORS, clampText, enforceDailyAIQuota, json, requireUser, validateImage } from '../_shared/security.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', en: 'English', ca: 'Catalan', eu: 'Basque', gl: 'Galician', val: 'Valencian',
};

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

function buildComparisonPrompt(lang: string): string {
  return `You are a careful plant pathology expert. Compare the BEFORE and AFTER photos of the same plant and respond ONLY with valid JSON (no other text):
{
  "status": one of: "mejora", "estable", "empeora", "incierto",
  "confidence": one of: "alta", "media", "baja",
  "summary": "1-2 concise sentences in ${lang} describing the visible change",
  "nextStep": "one practical next step in ${lang}"
}
Use "incierto" when the framing, lighting, or image quality does not allow a fair comparison. Never claim certainty about a disease from photos alone. All text must be in ${lang}.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'METHOD' }, 405);

  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const apiKey = Deno.env.get('ANTHROPIC_KEY');
  if (!apiKey) return json({ error: 'Server not configured', code: 'NO_KEY' }, 500);

  let body: {
    mode?: string;
    base64?: string;
    mediaType?: string;
    language?: string;
    cropName?: string;
    cropNames?: Record<string, string>;
    plantName?: string;
    beforeBase64?: string;
    beforeMediaType?: string;
    afterBase64?: string;
    afterMediaType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body', code: 'BAD_REQUEST' }, 400);
  }

  const { mode, base64, mediaType, language } = body;
  if (mode !== 'identify-pest' && mode !== 'compare-diagnosis' && mode !== 'scan-plant') {
    return json({ error: 'Unknown mode', code: 'BAD_REQUEST' }, 400);
  }
  if (mode === 'scan-plant' && body.cropNames !== undefined) {
    if (!body.cropNames || typeof body.cropNames !== 'object' || Array.isArray(body.cropNames)) {
      return json({ error: 'Invalid crop catalogue', code: 'BAD_REQUEST' }, 400);
    }
    const cropEntries = Object.entries(body.cropNames);
    if (cropEntries.length > 150 || cropEntries.some(([id, name]) => id.length > 80 || typeof name !== 'string' || name.length > 100)) {
      return json({ error: 'Invalid crop catalogue', code: 'BAD_REQUEST' }, 400);
    }
  }
  const isComparison = mode === 'compare-diagnosis';
  if (isComparison
    ? !body.beforeBase64 || !body.beforeMediaType || !body.afterBase64 || !body.afterMediaType
    : !base64 || !mediaType) return json({ error: 'Missing image', code: 'BAD_REQUEST' }, 400);
  const imageErrors = isComparison
    ? [
        validateImage(body.beforeBase64, body.beforeMediaType),
        validateImage(body.afterBase64, body.afterMediaType),
      ].filter(Boolean)
    : [validateImage(base64, mediaType)].filter(Boolean);
  if (imageErrors.length > 0) return json({ error: imageErrors[0], code: 'BAD_REQUEST' }, 400);
  const quotaResponse = await enforceDailyAIQuota(user.id);
  if (quotaResponse) return quotaResponse;
  const lang = LANG_NAMES[language ?? 'es'] ?? 'Spanish';

  let system: string;
  let userText: string;
  let maxTokens: number;
  let content: Array<Record<string, unknown>>;
  if (mode === 'identify-pest') {
    system = buildPestPrompt(lang);
    userText = `Analyze this ${clampText(body.cropName, 100) ?? 'plant'} for pests, diseases, or deficiencies.`;
    maxTokens = 1024;
    content = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: userText },
    ];
  } else if (mode === 'scan-plant') {
    system = buildScanPrompt(lang, body.cropNames ?? {});
    userText = 'Identify this plant and match it to our database.';
    maxTokens = 512;
    content = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: userText },
    ];
  } else if (mode === 'compare-diagnosis') {
    system = buildComparisonPrompt(lang);
    userText = `Compare these two photos of ${clampText(body.plantName, 100) ?? 'the plant'}. The first image is BEFORE treatment and the second is AFTER treatment.`;
    maxTokens = 512;
    content = [
      { type: 'text', text: 'BEFORE photo:' },
      { type: 'image', source: { type: 'base64', media_type: body.beforeMediaType, data: body.beforeBase64 } },
      { type: 'text', text: 'AFTER photo:' },
      { type: 'image', source: { type: 'base64', media_type: body.afterMediaType, data: body.afterBase64 } },
      { type: 'text', text: userText },
    ];
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
          content,
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
