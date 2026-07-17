import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getProfile, updateDisplayName } from '../services/profileService';
import { useAuth } from './useAuth';

export const profileQueryKey = (userId: string) => ['profile', userId] as const;

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: profileQueryKey(user?.id ?? 'signed-out'),
    queryFn: () => getProfile(user!.id),
    enabled: Boolean(user),
  });
}

export function useUpdateDisplayName() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (displayName: string) => updateDisplayName(user!.id, displayName),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKey(profile.id), profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
    },
  });
}
