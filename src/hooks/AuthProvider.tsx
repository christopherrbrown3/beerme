import { type Session } from '@supabase/supabase-js';
import { type PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabaseClient();
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setIsLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signOut: async () => {
        await getSupabaseClient().auth.signOut();
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
