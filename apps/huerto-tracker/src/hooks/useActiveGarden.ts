import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCollection } from '@portfolio/storage';
import { useEffect, useState } from 'react';
import type { Garden } from '../models/garden';

const ACTIVE_KEY = '@portfolio/active_garden_id';

export function useActiveGarden() {
  const gardens = useCollection<Garden>('gardens');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_KEY).then((id) => {
      setActiveId(id);
      setLoaded(true);
    });
  }, []);

  const activeGarden =
    (loaded && activeId ? gardens.items.find((g) => g.id === activeId) : null) ??
    gardens.items[0] ??
    null;

  async function switchGarden(id: string) {
    await AsyncStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
  }

  return { activeGarden, gardens: gardens.items, switchGarden, gardensLoading: gardens.loading };
}
