import { useSession } from '@portfolio/supabase';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncFromCloud, syncToCloud } from './syncAll';

/**
 * Mounts in _layout.tsx. Handles:
 * 1. First login (guest → authenticated): push local data to cloud, then pull.
 * 2. Every app-focus when authenticated: pull from cloud, then push local changes.
 */
export function useSyncProvider() {
  const { user, isAuthenticated, loading } = useSession();
  const userId = user?.id ?? null;

  // Track the previous auth state to detect the guest → authenticated transition
  const prevAuthRef = useRef<boolean | null>(null);
  const syncedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading || !userId) {
      prevAuthRef.current = false;
      return;
    }

    const wasGuest = prevAuthRef.current === false;
    prevAuthRef.current = true;

    // First login: migrate local data up, then pull cloud
    if (wasGuest && !syncedRef.current.has(userId)) {
      syncedRef.current.add(userId);
      syncToCloud(userId).then(() => syncFromCloud(userId));
      return;
    }

    // Already authenticated on mount: just pull
    syncFromCloud(userId);
  }, [isAuthenticated, loading, userId]);

  // Sync on app foreground
  useEffect(() => {
    if (!userId) return;

    function handleAppState(next: AppStateStatus) {
      if (next === 'active' && userId) {
        syncFromCloud(userId).then(() => syncToCloud(userId));
      }
    }

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [userId]);
}
