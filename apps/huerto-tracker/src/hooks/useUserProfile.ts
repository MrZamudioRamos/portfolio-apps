import { useCollection } from '@portfolio/storage';
import type { UserProfile } from '../models';

export function useUserProfile() {
  const profiles = useCollection<UserProfile>('user-profile');
  const profile = profiles.items[0] ?? null;

  async function save(data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    if (profile) {
      await profiles.update(profile.id, data);
    } else {
      await profiles.create(data);
    }
  }

  return { profile, save, loading: profiles.loading };
}
