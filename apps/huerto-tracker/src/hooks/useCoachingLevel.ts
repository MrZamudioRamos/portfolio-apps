import { useEffect, useMemo, useRef } from 'react';
import { useCollection } from '@portfolio/storage';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { CoachingLevel } from '../models/user-profile';
import { buildGamificationData } from '../utils/gamification';
import { advanceFloor, deriveCoachingLevel, RANK } from '../utils/coachingLevel';
import { useUserProfile } from './useUserProfile';
import { track, EVENTS } from '../analytics';

export function useCoachingLevel(): CoachingLevel {
  const { profile, save } = useUserProfile();
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');

  const data = useMemo(
    () => buildGamificationData(plants.items, entries.items),
    [plants.items, entries.items]
  );

  const advanced = advanceFloor(profile?.coachingFloor, data);

  // Persist floor only when it actually advances (ratchet, no downgrade).
  // Guard with ref to avoid write-loop when profile updates mid-render.
  const persistingRef = useRef(false);
  useEffect(() => {
    if (!profile) return;
    const currentRank = RANK[profile.coachingFloor ?? 'full'];
    if (RANK[advanced] <= currentRank) return;
    if (persistingRef.current) return;
    persistingRef.current = true;
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = profile as any;
    save({ ...rest, coachingFloor: advanced }).finally(() => {
      persistingRef.current = false;
    });
  }, [advanced, profile?.coachingFloor]);

  const level = deriveCoachingLevel({
    experience: profile?.experience,
    floor: advanced,
    override: profile?.coachingOverride ?? null,
  });

  // Track effective level changes.
  const prevLevelRef = useRef<CoachingLevel | null>(null);
  useEffect(() => {
    if (prevLevelRef.current !== null && prevLevelRef.current !== level) {
      track(EVENTS.coachingLevelChanged, { from: prevLevelRef.current, to: level });
    }
    prevLevelRef.current = level;
  }, [level]);

  return level;
}
