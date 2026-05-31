import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from '@portfolio/storage';

const PHOTO_DIR = FileSystem.documentDirectory + 'plant-photos/';

/**
 * Copy a freshly-picked image (which lives in a volatile cache uri that the OS
 * can purge) into the app's document directory so it stays valid and displays
 * immediately. Returns a stable file:// uri; the sync layer later uploads it to
 * Storage and rewrites it to an https URL. Falls back to the original uri on
 * any failure so the caller never loses the pick.
 */
export async function persistPickedImage(uri: string): Promise<string> {
  // Already a remote URL — nothing to persist.
  if (/^https?:\/\//.test(uri)) return uri;
  try {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true }).catch(() => {});
    const ext = (uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
    const dest = `${PHOTO_DIR}${generateId()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}
