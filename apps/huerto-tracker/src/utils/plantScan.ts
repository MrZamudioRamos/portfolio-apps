export interface PlantScanResult {
  identified: boolean;
  cropId: string | null;
  cropName: string;
  growthStage: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'dormant';
  notes: string;
  confidence: 'alta' | 'media' | 'baja';
}

async function imageToBase64(uri: string): Promise<string> {
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

export async function scanPlant(
  imageUri: string,
  language: string,
  cropNames: Record<string, string>
): Promise<PlantScanResult> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
  if (!apiKey) {
    const err = new Error('NO_KEY') as Error & { code: string };
    err.code = 'NO_KEY';
    throw err;
  }

  const base64 = await imageToBase64(imageUri);
  const mediaType = mediaTypeFromUri(imageUri);
  const lang = LANG_NAMES[language] ?? 'Spanish';

  const cropList = Object.entries(cropNames)
    .map(([id, name]) => `${id}: ${name}`)
    .join('\n');

  const systemPrompt = `You are a botanist expert. Analyze the plant image and identify it.
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: 'Identify this plant and match it to our database.' },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('[plantScan] API error', response.status, body);
    const err = new Error(`HTTP ${response.status}`) as Error & { code: string };
    err.code = 'API_ERROR';
    throw err;
  }

  const data = await response.json() as { content?: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error('[plantScan] Could not parse JSON:', text);
    const err = new Error('PARSE_ERROR') as Error & { code: string };
    err.code = 'PARSE_ERROR';
    throw err;
  }

  return JSON.parse(match[0]) as PlantScanResult;
}
