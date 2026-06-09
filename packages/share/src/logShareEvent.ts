import { getDeviceId } from './deviceId';

export interface LogShareEventOptions {
  app: string;
  eventType: string;
  refCode: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function generateRefCode(): string {
  let r = '';
  for (let i = 0; i < 8; i++) r += CHARS[Math.floor(Math.random() * CHARS.length)];
  return r;
}

export async function logShareEvent(opts: LogShareEventOptions): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await fetch(`${opts.supabaseUrl}/rest/v1/share_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: opts.supabaseAnonKey,
        Authorization: `Bearer ${opts.supabaseAnonKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        app: opts.app,
        event_type: opts.eventType,
        ref_code: opts.refCode,
        device_id: deviceId,
      }),
    });
  } catch {
    // non-blocking — share works even if attribution log fails
  }
}
