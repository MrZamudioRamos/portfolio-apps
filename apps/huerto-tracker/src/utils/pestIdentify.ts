import { getSupabase } from '@portfolio/supabase';

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

function fail(code: string): Error & { code: string } {
  const err = new Error(code) as Error & { code: string };
  err.code = code;
  return err;
}

export async function identifyPest(
  imageUri: string,
  cropName: string,
  language: string
): Promise<PestDiagnosis> {
  // Image stays client-side (it's a local file); only base64 is sent to our
  // Edge Function, which holds the Anthropic key and calls the model.
  const base64 = await imageToBase64(imageUri);
  const mediaType = mediaTypeFromUri(imageUri);

  const { data, error } = await getSupabase().functions.invoke('ai-vision', {
    body: { mode: 'identify-pest', base64, mediaType, language, cropName },
  });

  if (error || !data) {
    console.error('[pestIdentify] edge function error', error);
    throw fail('API_ERROR');
  }
  if ((data as { code?: string }).code) throw fail((data as { code: string }).code);

  return data as PestDiagnosis;
}
