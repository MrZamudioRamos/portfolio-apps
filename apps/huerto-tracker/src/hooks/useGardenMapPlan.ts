import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { EMPTY_GARDEN_MAP_PLAN, normalizeGardenMapPlan, type GardenMapPlan } from '../models/garden-map-plan';

export const gardenMapPlanKey = (gardenId: string) => `@portfolio/huerto/garden_map_plan/${gardenId}`;
export const gardenMapPlanTsKey = (gardenId: string) => `${gardenMapPlanKey(gardenId)}/ts`;

export function useGardenMapPlan(gardenId: string | undefined) {
  const [plan, setPlan] = useState<GardenMapPlan>(EMPTY_GARDEN_MAP_PLAN);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadedGardenId, setLoadedGardenId] = useState<string | undefined>();
  const skipNextWriteRef = useRef(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    if (!gardenId) {
      skipNextWriteRef.current = true;
      setPlan(EMPTY_GARDEN_MAP_PLAN);
      setLoadedGardenId(undefined);
      setLoading(false);
      return () => { current = false; };
    }
    skipNextWriteRef.current = true;
    AsyncStorage.getItem(gardenMapPlanKey(gardenId))
      .then((raw) => {
        if (!current) return;
        try { setPlan(raw ? normalizeGardenMapPlan(JSON.parse(raw)) : EMPTY_GARDEN_MAP_PLAN); }
        catch { setPlan(EMPTY_GARDEN_MAP_PLAN); }
        setLoadedGardenId(gardenId);
      })
      .catch((reason) => {
        if (!current) return;
        setPlan(EMPTY_GARDEN_MAP_PLAN);
        setError(reason instanceof Error ? reason : new Error('No se pudo leer el plano guardado.'));
        setLoadedGardenId(gardenId);
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [gardenId]);

  useEffect(() => {
    if (!gardenId || loadedGardenId !== gardenId || loading || error) return;
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    const timestamp = new Date().toISOString();
    AsyncStorage.multiSet([
      [gardenMapPlanKey(gardenId), JSON.stringify(plan)],
      [gardenMapPlanTsKey(gardenId), timestamp],
    ]).catch((reason) => setError(reason instanceof Error ? reason : new Error('No se pudo guardar el plano.')));
  }, [error, gardenId, loadedGardenId, loading, plan]);

  return { plan, setPlan, loading, error };
}
