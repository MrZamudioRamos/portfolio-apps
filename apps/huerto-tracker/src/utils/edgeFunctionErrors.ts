/** Extracts the structured error body returned by a non-2xx Supabase Edge Function response. */
export async function getEdgeFunctionErrorCode(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object' || !('context' in error)) return 'API_ERROR';

  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== 'object' || !('clone' in context)) return 'API_ERROR';

  try {
    const response = context as Response;
    const payload: unknown = await response.clone().json();
    if (payload && typeof payload === 'object' && 'code' in payload) {
      const code = (payload as { code?: unknown }).code;
      if (typeof code === 'string' && code.length > 0) return code;
    }
  } catch {
    // Preserve the generic upstream error when the platform response isn't JSON.
  }

  return 'API_ERROR';
}
