export type MagicSentMessageKey = 'magicSent.message' | 'magicSent.messageWithoutAddress';

export function getMagicSentDisplay(email?: string | string[] | null): {
  email: string | null;
  messageKey: MagicSentMessageKey;
} {
  const candidate = Array.isArray(email) ? email[0] : email;
  const recipient = candidate?.trim() || null;
  return {
    email: recipient,
    messageKey: recipient ? 'magicSent.message' : 'magicSent.messageWithoutAddress',
  };
}
