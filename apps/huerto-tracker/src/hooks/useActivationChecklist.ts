import { useCollection } from '@portfolio/storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Garden } from '../models';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import { buildGamificationData } from '../utils/gamification';
import {
  buildActivationChecklist,
  deriveActivationPhase,
  isChecklistVisible,
  ACTIVATION_CALENDAR_KEY,
  ONBOARDING_COMPLETED_KEY,
  type ActivationPhase,
  type ChecklistItem,
} from '../utils/activation';

interface UseActivationChecklistResult {
  phase: ActivationPhase;
  checklist: ChecklistItem[];
  visible: boolean;
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
}

export function useActivationChecklist(): UseActivationChecklistResult {
  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');

  const [calendarVisited, setCalendarVisited] = useState(false);
  const [onboardingDays, setOnboardingDays] = useState(0);
  const loadedRef = useRef(false);

  // Load persisted flags once
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const [calFlag, tsStr] = await Promise.all([
        AsyncStorage.getItem(ACTIVATION_CALENDAR_KEY),
        AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY),
      ]);
      if (calFlag === '1') setCalendarVisited(true);
      if (tsStr) {
        const ts = Number(tsStr);
        if (!Number.isNaN(ts)) {
          const days = Math.floor((Date.now() - ts) / 86_400_000);
          setOnboardingDays(days);
        }
      }
    })();
  }, []);

  const gamificationData = useMemo(
    () => buildGamificationData(plants.items, entries.items),
    [plants.items, entries.items],
  );

  const phase = useMemo(
    () => deriveActivationPhase(onboardingDays, gamificationData),
    [onboardingDays, gamificationData],
  );

  const gardenExists = gardens.items.length > 0;
  const plantExists = plants.items.length > 0;
  const secondPlantExists = plants.items.length >= 2;
  const wateringExists = entries.items.some((e) => e.type === 'watering');

  const checklist = useMemo(
    () =>
      buildActivationChecklist({
        gardenExists,
        plantExists,
        wateringExists,
        calendarVisited,
        secondPlantExists,
      }),
    [gardenExists, plantExists, wateringExists, calendarVisited, secondPlantExists],
  );

  const completedCount = checklist.filter((i) => i.completed).length;
  const totalCount = checklist.length;
  const allCompleted = completedCount === totalCount;
  const visible = isChecklistVisible(onboardingDays, allCompleted);

  return { phase, checklist, visible, completedCount, totalCount, allCompleted };
}
