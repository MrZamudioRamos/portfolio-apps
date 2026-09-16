import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _configured = false;

const DISABLED_URL = 'https://supabase-not-configured.invalid';
const DISABLED_KEY = 'local-only-anon-key';

function isUsableConfig(url: string | undefined, anonKey: string | undefined): url is string {
  if (!url || !anonKey || anonKey.length < 20) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.hostname.endsWith('.invalid');
  } catch {
    return false;
  }
}

export function initSupabase(url?: string, anonKey?: string): SupabaseClient {
  _configured = isUsableConfig(url, anonKey);
  _client = createClient(_configured ? url! : DISABLED_URL, _configured ? anonKey! : DISABLED_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return _configured;
}

export function getSupabase(): SupabaseClient {
  if (!_client) throw new Error('Supabase not initialized. Call initSupabase() first.');
  return _client;
}
