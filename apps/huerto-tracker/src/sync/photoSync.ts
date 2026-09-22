import { getSupabase } from '@portfolio/supabase';
import { generateId } from '@portfolio/storage';

const BUCKET = 'photos';

// expo-file-system moved readAsStringAsync to /legacy in SDK 54+. Metro needs
// static require() literals, so we try each module explicitly.
type FsLike = { readAsStringAsync?: (u: string, o: { encoding: string }) => Promise<string> };
type EncodedPhoto = { base64: string; contentType?: string };

async function readBase64(uri: string): Promise<EncodedPhoto | null> {
  const dataUrl = uri.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
  if (dataUrl) return { base64: dataUrl[2], contentType: dataUrl[1].toLowerCase() };
  if (uri.startsWith('blob:')) {
    try {
      const blob = await fetch(uri).then((response) => response.blob());
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return { base64: bytesToBase64(bytes), contentType: blob.type.startsWith('image/') ? blob.type : undefined };
    } catch {
      return null;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try {
    const fs = require('expo-file-system') as FsLike;
    if (typeof fs?.readAsStringAsync === 'function') {
      const b64 = await fs.readAsStringAsync(uri, { encoding: 'base64' });
      if (b64) return { base64: b64 };
    }
  } catch {
    /* fall through */
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try {
    const fs = require('expo-file-system/legacy') as FsLike;
    if (typeof fs?.readAsStringAsync === 'function') {
      const b64 = await fs.readAsStringAsync(uri, { encoding: 'base64' });
      if (b64) return { base64: b64 };
    }
  } catch {
    /* give up */
  }
  return null;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const hasB = i + 1 < bytes.length;
    const hasC = i + 2 < bytes.length;
    const b = hasB ? bytes[i + 1] : 0;
    const c = hasC ? bytes[i + 2] : 0;
    output += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)]
      + (hasB ? B64[((b & 15) << 2) | (c >> 6)] : '=')
      + (hasC ? B64[c & 63] : '=');
  }
  return output;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = B64.indexOf(clean[i]);
    const e2 = B64.indexOf(clean[i + 1]);
    const e3 = B64.indexOf(clean[i + 2]);
    const e4 = B64.indexOf(clean[i + 3]);
    out[p++] = (e1 << 2) | (e2 >> 4);
    if (e3 !== -1) out[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (e4 !== -1) out[p++] = ((e3 & 3) << 6) | e4;
  }
  return out.subarray(0, p);
}

/**
 * Upload a local file:// image to the user's folder in Storage and return its
 * public URL. Returns null on failure (caller keeps the local uri).
 */
export async function uploadPhoto(localUri: string, userId: string): Promise<string | null> {
  const encoded = await readBase64(localUri);
  if (!encoded) return null;
  const contentType = encoded.contentType ?? (localUri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg');
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${generateId()}.${ext}`;
  try {
    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(path, base64ToBytes(encoded.base64), {
        contentType,
        upsert: false,
      });
    if (error) {
      console.warn('[photoSync] upload failed:', error.message);
      return null;
    }
    return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn('[photoSync] upload threw:', e);
    return null;
  }
}

/**
 * Replace any local file:// photoUri in the list with an uploaded public URL.
 * Mutates items in place; returns true if anything changed (so the caller can
 * persist the list back to local storage).
 */
export async function uploadLocalPhotos<T extends { photoUri?: string }>(
  items: T[],
  userId: string
): Promise<boolean> {
  let changed = false;
  for (const item of items) {
    if (item.photoUri && /^(file:\/\/|content:\/\/|blob:|data:image\/)/i.test(item.photoUri)) {
      const url = await uploadPhoto(item.photoUri, userId);
      if (url) {
        item.photoUri = url;
        changed = true;
      }
    }
  }
  return changed;
}
