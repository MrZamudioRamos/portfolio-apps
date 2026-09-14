import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export interface FreeMapPosition {
  x: number;
  y: number;
}

type FreeMapPositions = Record<string, FreeMapPosition>;

const positionsKey = (gardenId: string) => `@portfolio/huerto/garden_free_layout/${gardenId}`;

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
    AsyncStorage.getItem(positionsKey(gardenId))
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
      void AsyncStorage.setItem(positionsKey(gardenId), JSON.stringify(next));
      return next;
    });
  }

  return { positions, loading, setPosition };
}
