import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { profileQueryKey, useUpdateDisplayName } from './useProfile';

const profileService = vi.hoisted(() => ({
  updateDisplayName: vi.fn(),
}));

vi.mock('../services/profileService', () => ({
  getProfile: vi.fn(),
  updateDisplayName: profileService.updateDisplayName,
}));

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

describe('useUpdateDisplayName', () => {
  beforeEach(() => profileService.updateDisplayName.mockReset());

  it('updates the profile and invalidates every cached identity consumer', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const profile = {
      id: 'user-1',
      username: 'friend',
      display_name: 'New Name',
      created_at: '2026-07-17T00:00:00.000Z',
    };
    profileService.updateDisplayName.mockResolvedValue(profile);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateDisplayName(), { wrapper });

    await act(() => result.current.mutateAsync('New Name'));

    expect(queryClient.getQueryData(profileQueryKey('user-1'))).toEqual(profile);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });
  });
});
