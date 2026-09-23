import { describe, expect, it } from 'vitest';
import { getMagicSentDisplay } from '../magicSentDisplay';

describe('getMagicSentDisplay', () => {
  it('shows only the recipient passed by the auth route', () => {
    expect(getMagicSentDisplay('  grower@example.com  ')).toEqual({
      email: 'grower@example.com',
      messageKey: 'magicSent.message',
    });
  });

  it('uses neutral correction copy when the route has no recipient', () => {
    expect(getMagicSentDisplay(undefined)).toEqual({
      email: null,
      messageKey: 'magicSent.messageWithoutAddress',
    });
    expect(getMagicSentDisplay(['', 'other@example.com'])).toEqual({
      email: null,
      messageKey: 'magicSent.messageWithoutAddress',
    });
  });
});
