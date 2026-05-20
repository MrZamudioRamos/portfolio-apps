import type { CropInfo } from '../data/crops';

export interface FaqItem {
  q: string;
  a: string;
}

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', en: 'English', ca: 'Catalan', eu: 'Basque', gl: 'Galician', val: 'Valencian',
};

const CACHE_PREFIX = 'cropfaq_v1_';

function cacheKey(cropId: string, lang: string) {
  return `${CACHE_PREFIX}${cropId}_${lang}`;
}

async function readCache(key: string): Promise<FaqItem[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw) as FaqItem[];
  } catch {}
  return null;
}

async function writeCache(key: string, items: FaqItem[]): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

export async function getCropFaq(
  crop: CropInfo,
  cropName: string,
  language: string
): Promise<FaqItem[]> {
  const key = cacheKey(crop.id, language);
  const cached = await readCache(key);
  if (cached) return cached;

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
  if (!apiKey) {
    const err = new Error('NO_KEY') as Error & { code: string };
    err.code = 'NO_KEY';
    throw err;
  }

  const lang = LANG_NAMES[language] ?? 'Spanish';

  const systemPrompt = `You are a gardening expert. Generate exactly 12 frequently asked questions and answers about growing ${cropName} (${crop.id}).
Context: sun=${crop.sunNeeds}, water=${crop.waterNeeds}, spacing=${crop.spacing}cm, category=${crop.category}.
Tip: ${crop.tips}

Respond ONLY with valid JSON array (no other text):
[
  {"q": "question in ${lang}", "a": "answer in 2-3 sentences in ${lang}"},
  ...12 items total
]
Cover: watering frequency, common pests, harvest signs, soil prep, fertilizing, companion plants, pruning, spacing, overwintering, propagation, troubleshooting yellowing leaves, and one regional tip for Spain.
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
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate the FAQ for ${cropName}.` }],
    }),
  });

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`) as Error & { code: string };
    err.code = 'API_ERROR';
    throw err;
  }

  const data = await response.json() as { content?: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    const err = new Error('PARSE_ERROR') as Error & { code: string };
    err.code = 'PARSE_ERROR';
    throw err;
  }

  const items = JSON.parse(match[0]) as FaqItem[];
  await writeCache(key, items);
  return items;
}
