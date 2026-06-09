import { useCallback, useRef } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { generateRefCode, logShareEvent } from './logShareEvent';

export interface UseShareCardOptions {
  app: string;
  eventType: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function useShareCard({ app, eventType, supabaseUrl, supabaseAnonKey }: UseShareCardOptions) {
  const cardRef = useRef<any>(null);

  const share = useCallback(async (): Promise<boolean> => {
    if (!cardRef.current) return false;
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const refCode = generateRefCode();
      // fire-and-forget — never blocks the share sheet
      logShareEvent({ app, eventType, refCode, supabaseUrl, supabaseAnonKey });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '' });
      return true;
    } catch {
      return false;
    }
  }, [app, eventType, supabaseUrl, supabaseAnonKey]);

  return { cardRef, share };
}
