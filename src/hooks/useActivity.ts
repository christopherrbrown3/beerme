import { useQuery } from '@tanstack/react-query';

import { getActivity } from '../services/activityService';

export const activityQueryKey = ['activity'] as const;

export function useActivity() {
  return useQuery({ queryKey: activityQueryKey, queryFn: getActivity });
}
