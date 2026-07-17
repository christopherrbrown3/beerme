import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSupabaseClient } from '../lib/supabase';

export function useAppRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('app-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['groups'] });
        void queryClient.invalidateQueries({ queryKey: ['group'] });
        void queryClient.invalidateQueries({ queryKey: ['transactions'] });
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['groups'] });
        void queryClient.invalidateQueries({ queryKey: ['group'] });
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
