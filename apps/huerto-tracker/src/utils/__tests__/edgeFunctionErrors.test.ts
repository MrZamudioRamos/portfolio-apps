import { describe, expect, it } from 'vitest';
import { getEdgeFunctionErrorCode } from '../edgeFunctionErrors';

describe('getEdgeFunctionErrorCode', () => {
  it('reads a structured code from Supabase non-2xx responses', async () => {
    const context = new Response(JSON.stringify({ error: 'Daily cap reached', code: 'DAILY_BUDGET' }), { status: 429 });
    await expect(getEdgeFunctionErrorCode({ context })).resolves.toBe('DAILY_BUDGET');
  });

  it('falls back to a generic code when the error has no JSON response', async () => {
    await expect(getEdgeFunctionErrorCode(new Error('network error'))).resolves.toBe('API_ERROR');
  });
});
