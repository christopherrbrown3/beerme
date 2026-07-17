import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createGroup, getGroups, joinGroup } from '../services/groupService';
import { type CreateGroupInput, type GroupSummary } from '../types/groups';
import { useAuth } from './useAuth';

export const groupsQueryKey = (userId: string) => ['groups', userId] as const;

export function useGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: groupsQueryKey(user!.id),
    queryFn: () => getGroups(user!.id),
  });
}

type CreateGroupContext = {
  previousGroups?: GroupSummary[];
  optimisticId: string;
};

export function useCreateGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = groupsQueryKey(user!.id);

  return useMutation<GroupSummary, Error, CreateGroupInput, CreateGroupContext>({
    mutationFn: (input) => createGroup(user!.id, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGroups = queryClient.getQueryData<GroupSummary[]>(queryKey);
      const optimisticId = `optimistic-${crypto.randomUUID()}`;

      queryClient.setQueryData<GroupSummary[]>(queryKey, (groups = []) => [
        {
          id: optimisticId,
          name: input.name.trim(),
          description: input.description.trim() || null,
          ownerId: user!.id,
          inviteToken: '',
          createdAt: new Date().toISOString(),
          memberCount: 1,
          role: 'owner',
          currentUserBalance: 0,
          lastActivityAt: null,
          currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
        },
        ...groups,
      ]);

      return { previousGroups, optimisticId };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previousGroups);
    },
    onSuccess: (createdGroup, _input, context) => {
      queryClient.setQueryData<GroupSummary[]>(queryKey, (groups = []) =>
        groups.map((group) => (group.id === context.optimisticId ? createdGroup : group)),
      );
    },
  });
}

export function useJoinGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinGroup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupsQueryKey(user!.id) });
    },
  });
}
