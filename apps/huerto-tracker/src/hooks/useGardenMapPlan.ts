import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import type { GardenType } from '../models/garden';
import { DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS } from './useGardenLayout';
import { gardenMapSceneKey, gardenMapSceneTimestampKey, loadOrMigrateGardenMapScene } from '../utils/gardenMapSceneStorage';
import { EMPTY_GARDEN_MAP_PLAN, type GardenMapPlanV2 } from '../models/garden-map-plan';

export { gardenMapPlanKey, gardenMapPlanTsKey } from '../utils/gardenMapStorageKeys';

const EMPTY_SCENE: GardenMapPlanV2 = {
  ...EMPTY_GARDEN_MAP_PLAN,
  version: 2,
  plantPlacements: [],
};

export function useGardenMapPlan(
  gardenId: string | undefined,
  gardenType?: GardenType,
  gridRows: number = DEFAULT_GRID_ROWS,
  gridCols: number = DEFAULT_GRID_COLS,
) {
  const [plan, setPlan] = useState<GardenMapPlanV2>(EMPTY_SCENE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadedGardenId, setLoadedGardenId] = useState<string | undefined>();
  const skipNextWriteRef = useRef(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    setLoadedGardenId(undefined);
    if (!gardenId) {
      skipNextWriteRef.current = true;
      setPlan(EMPTY_SCENE);
      setLoading(false);
      return () => { current = false; };
    }
    skipNextWriteRef.current = true;
    setPlan(EMPTY_SCENE);
    loadOrMigrateGardenMapScene(gardenId, gardenType, AsyncStorage, { rows: gridRows, cols: gridCols })
      .then((scene) => {
        if (!current) return;
        setPlan(scene);
        setLoadedGardenId(gardenId);
      })
      .catch((reason) => {
        if (!current) return;
        setError(reason instanceof Error ? reason : new Error('No se pudo recuperar el plano guardado.'));
        setLoadedGardenId(gardenId);
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [gardenId, gardenType, gridCols, gridRows]);

  useEffect(() => {
    if (!gardenId || loadedGardenId !== gardenId || loading || error) return;
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    const timestamp = new Date().toISOString();
    AsyncStorage.multiSet([
      [gardenMapSceneKey(gardenId), JSON.stringify(plan)],
      [gardenMapSceneTimestampKey(gardenId), timestamp],
    ]).catch((reason) => setError(reason instanceof Error ? reason : new Error('No se pudo guardar el plano.')));
  }, [error, gardenId, loadedGardenId, loading, plan]);

  return { plan, setPlan, loading, error };
}
