import { type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSupabaseClient } from '../lib/supabase';
import { type GroupDetails, type GroupSummary } from '../types/groups';
import { useAuth } from './useAuth';

type MembershipChangeRow = {
  group_id: string;
  user_id: string;
};

export function useAppRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserId = user?.id;

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('app-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['groups'] });
        void queryClient.invalidateQueries({ queryKey: ['group'] });
        void queryClient.invalidateQueries({ queryKey: ['transactions'] });
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memberships' },
        (payload: RealtimePostgresChangesPayload<MembershipChangeRow>) => {
          const membership = payload.eventType === 'DELETE' ? payload.old : payload.new;
          const groupId = membership.group_id;
          const changedUserId = membership.user_id;

          if (
            !groupId ||
            !changedUserId ||
            !isMembershipChangeRelevant(queryClient, groupId, changedUserId, currentUserId)
          ) {
            return;
          }

          if (payload.eventType === 'DELETE' && changedUserId === currentUserId) {
            void queryClient.resetQueries({ queryKey: ['group', groupId], exact: true });
            void queryClient.resetQueries({ queryKey: ['transactions', groupId], exact: true });
            void queryClient.invalidateQueries({ queryKey: ['groups'] });
            void queryClient.invalidateQueries({ queryKey: ['activity'] });
            return;
          }

          void queryClient.invalidateQueries({ queryKey: ['groups'] });
          void queryClient.invalidateQueries({ queryKey: ['group', groupId] });
          void queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['profile'] });
        void queryClient.invalidateQueries({ queryKey: ['group'] });
        void queryClient.invalidateQueries({ queryKey: ['transactions'] });
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['groups'] });
        void queryClient.invalidateQueries({ queryKey: ['group'] });
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, queryClient]);
}

function isMembershipChangeRelevant(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
  changedUserId: string,
  currentUserId: string,
) {
  if (changedUserId === currentUserId) return true;

  const group = queryClient.getQueryData<GroupDetails>(['group', groupId]);
  if (group?.members.some((member) => member.userId === currentUserId)) return true;

  return queryClient
    .getQueriesData<GroupSummary[]>({ queryKey: ['groups'] })
    .some(([, groups]) => groups?.some((candidate) => candidate.id === groupId));
}
