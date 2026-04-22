import { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { getSupabase } from './client';
import type { UserTier } from './types';

export interface SessionState {
  session: Session | null;
  user: User | null;
  tier: UserTier;
  loading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const isGuest = !user;

  // tier derived from user metadata / profile (can be enriched later with DB query)
  const tier: UserTier = isGuest ? 'guest' : ((user.user_metadata?.tier as UserTier) ?? 'free');

  return {
    session,
    user,
    tier,
    loading,
    isGuest,
    isAuthenticated: !isGuest,
  };
}
