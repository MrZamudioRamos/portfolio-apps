import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getSupabase } from './client';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'semilla', path: 'auth/callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type === 'success' && result.url) {
    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) throw exchangeError;
    }
  }
}

export async function signInWithApple(): Promise<void> {
  const supabase = getSupabase();

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) throw new Error('No identity token from Apple');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;
}

export async function signInWithMagicLink(email: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

/**
 * Permanently delete the signed-in user's account (and all their data, via DB
 * cascade) through the `delete-account` Edge Function. Throws on failure so the
 * caller can keep the account intact and show an error.
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await getSupabase().functions.invoke('delete-account');
  if (error || (data && (data as { error?: string }).error)) {
    throw new Error('DELETE_ACCOUNT_FAILED');
  }
}

export async function handleDeepLink(url: string): Promise<void> {
  const supabase = getSupabase();
  if (url.includes('access_token') || url.includes('code=')) {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) console.warn('Deep link auth error:', error.message);
  }
}
