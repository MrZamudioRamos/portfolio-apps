import { getSupabase } from '@portfolio/supabase';
import type { Garden } from '../models/garden';
import type { Plant } from '../models/plant';
import { CROPS_BY_ID } from '../data/crops';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  garden: Garden,
  plants: Plant[],
  language: string,
): Promise<string> {
  const plantNames = plants
    .filter((p) => p.status !== 'finished')
    .map((p) => {
      const crop = CROPS_BY_ID[p.cropId];
      return crop ? crop.name : p.name;
    })
    .filter(Boolean)
    .slice(0, 20);

  const gardenContext = {
    climateZone: garden.climateZone,
    province: garden.province,
    hemisphere: garden.hemisphere ?? 'norte',
    gardenType: garden.gardenType ?? 'huerto',
    currentMonth: new Date().getMonth() + 1,
    plantNames,
  };

  const { data, error } = await getSupabase().functions.invoke('ai-chat', {
    body: { messages, gardenContext, language },
  });

  if (error || !data) {
    console.error('[aiChat] edge function error', error);
    throw new Error('API_ERROR');
  }
  if ((data as { code?: string }).code) throw new Error((data as { code: string }).code);
  const reply = (data as { reply?: string }).reply;
  if (!reply) throw new Error('EMPTY_REPLY');
  return reply;
}
