export interface PestDiagnosis {
  detected: boolean;
  name: string;
  type: 'plaga' | 'enfermedad' | 'deficiencia' | 'saludable';
  confidence: 'alta' | 'media' | 'baja';
  description: string;
  symptoms: string;
  treatments: Array<{
    type: 'organico' | 'preventivo' | 'quimico';
    name: string;
    instructions: string;
  }>;
}

async function imageToBase64(uri: string): Promise<string> {
  // Metro requires static string literals in require() — no dynamic require allowed

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try {
    const fs = require('expo-file-system') as any;
    if (typeof fs?.readAsStringAsync === 'function') {
      const b64: string = await fs.readAsStringAsync(uri, { encoding: 'base64' });
      if (b64) return b64;
    }
  } catch {}

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try {
    const fs = require('expo-file-system/legacy') as any;
    if (typeof fs?.readAsStringAsync === 'function') {
      const b64: string = await fs.readAsStringAsync(uri, { encoding: 'base64' });
      if (b64) return b64;
    }
  } catch {}

  // Fallback: fetch + FileReader (Hermes / RN 0.73+)
  const resp = await fetch(uri);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

function mediaTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', en: 'English', ca: 'Catalan', eu: 'Basque', gl: 'Galician', val: 'Valencian',
};

export async function identifyPest(
  imageUri: string,
  cropName: string,
  language: string
): Promise<PestDiagnosis> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
  if (!apiKey) {
    const err = new Error('NO_KEY') as Error & { code: string };
    err.code = 'NO_KEY';
    throw err;
  }

  const base64 = await imageToBase64(imageUri);
  const mediaType = mediaTypeFromUri(imageUri);
  const lang = LANG_NAMES[language] ?? 'Spanish';

  const systemPrompt = `You are a plant pathology expert. Analyze the plant image and respond ONLY with valid JSON (no other text):
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: `Analyze this ${cropName} plant for pests, diseases, or deficiencies.` },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('[pestIdentify] API error', response.status, body);
    const err = new Error(`HTTP ${response.status}`) as Error & { code: string };
    err.code = 'API_ERROR';
    throw err;
  }

  const data = await response.json() as { content?: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error('[pestIdentify] Could not parse JSON from response:', text);
    const err = new Error('PARSE_ERROR') as Error & { code: string };
    err.code = 'PARSE_ERROR';
    throw err;
  }

  return JSON.parse(match[0]) as PestDiagnosis;
}
