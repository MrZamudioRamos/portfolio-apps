import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export interface FreeMapPosition {
  x: number;
  y: number;
}

export type FreeMapPositions = Record<string, FreeMapPosition>;

export const freeLayoutKey = (gardenId: string) => `@portfolio/huerto/garden_free_layout/${gardenId}`;
export const freeLayoutTsKey = (gardenId: string) => `@portfolio/huerto/garden_free_layout/${gardenId}/ts`;

/** Persists hand-placed plant positions for balcony and indoor gardens. */
export function useGardenFreeLayout(gardenId: string | undefined) {
  const [positions, setPositions] = useState<FreeMapPositions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gardenId) {
      setPositions({});
      setLoading(false);
      return;
    }

    setLoading(true);
    AsyncStorage.getItem(freeLayoutKey(gardenId))
      .then((raw) => {
        if (!raw) {
          setPositions({});
          return;
        }
        try {
          setPositions(JSON.parse(raw) as FreeMapPositions);
        } catch {
          setPositions({});
        }
      })
      .catch(() => setPositions({}))
      .finally(() => setLoading(false));
  }, [gardenId]);

  function setPosition(plantId: string, position: FreeMapPosition) {
    if (!gardenId) return;
    setPositions((current) => {
      const next = { ...current, [plantId]: position };
      const now = new Date().toISOString();
      void AsyncStorage.setItem(freeLayoutKey(gardenId), JSON.stringify(next));
      void AsyncStorage.setItem(freeLayoutTsKey(gardenId), now);
      return next;
    });
  }

  function removePosition(plantId: string) {
    if (!gardenId) return;
    setPositions((current) => {
      if (!(plantId in current)) return current;
      const next = { ...current };
      delete next[plantId];
      const now = new Date().toISOString();
      void AsyncStorage.setItem(freeLayoutKey(gardenId), JSON.stringify(next));
      void AsyncStorage.setItem(freeLayoutTsKey(gardenId), now);
      return next;
    });
  }

  function clearAll() {
    if (!gardenId) return;
    const now = new Date().toISOString();
    setPositions({});
    void AsyncStorage.setItem(freeLayoutKey(gardenId), JSON.stringify({}));
    void AsyncStorage.setItem(freeLayoutTsKey(gardenId), now);
  }

  return { positions, loading, setPosition, removePosition, clearAll };
}
