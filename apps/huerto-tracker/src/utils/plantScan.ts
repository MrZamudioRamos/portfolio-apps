import { getSupabase } from '@portfolio/supabase';

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

function fail(code: string): Error & { code: string } {
  const err = new Error(code) as Error & { code: string };
  err.code = code;
  return err;
}

export async function scanPlant(
  imageUri: string,
  language: string,
  cropNames: Record<string, string>
): Promise<PlantScanResult> {
  // Image stays client-side; the Edge Function holds the Anthropic key.
  const base64 = await imageToBase64(imageUri);
  const mediaType = mediaTypeFromUri(imageUri);

  const { data, error } = await getSupabase().functions.invoke('ai-vision', {
    body: { mode: 'scan-plant', base64, mediaType, language, cropNames },
  });

  if (error || !data) {
    console.error('[plantScan] edge function error', error);
    throw fail('API_ERROR');
  }
  if ((data as { code?: string }).code) throw fail((data as { code: string }).code);

  return data as PlantScanResult;
}
