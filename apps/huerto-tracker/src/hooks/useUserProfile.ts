import { createStore, useCollection } from '@portfolio/storage';
import type { UserProfile } from '../models';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

const store = createStore<UserProfile>('user-profile');
let pending: Promise<unknown> = Promise.resolve();

export function useUserProfile() {
  const profiles = useCollection<UserProfile>('user-profile');
  const profile = profiles.items[0] ?? null;
  useFocusEffect(useCallback(() => { void profiles.refresh().catch(() => {}); }, [profiles.refresh]));

  async function save(data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    const write = pending.then(async () => {
      const existing = (await store.getAll()).find(item => !item.deletedAt);
      if (existing) await store.update(existing.id, data);
      else await store.create(data);
    });
    pending = write.catch(() => {});
    await write;
    await profiles.refresh();
  }

  return { profile, save, loading: profiles.loading };
}
