import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSupabaseClient } from '../lib/supabase';
import { getActivity } from '../services/activityService';

export const activityQueryKey = ['activity'] as const;

export function useActivity() {
  return useQuery({ queryKey: activityQueryKey, queryFn: getActivity });
}

export function useActivityRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        void queryClient.invalidateQueries({ queryKey: activityQueryKey });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memberships' }, () => {
        void queryClient.invalidateQueries({ queryKey: activityQueryKey });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
