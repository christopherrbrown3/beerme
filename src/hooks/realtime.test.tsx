import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppRealtime } from './useAppRealtime';

type RealtimeConfig = { table: string; filter?: string };
type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, string>;
  old: Record<string, string>;
};

const realtime = vi.hoisted(() => ({
  handlers: [] as Array<{ config: RealtimeConfig; callback: (payload: RealtimePayload) => void }>,
  channel: vi.fn(),
  removeChannel: vi.fn(() => Promise.resolve()),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({
    channel: realtime.channel,
    removeChannel: realtime.removeChannel,
  }),
}));

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

function createChannel() {
  const channel: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  } = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockImplementation(
    (_event: string, config: RealtimeConfig, callback: (payload: RealtimePayload) => void) => {
      realtime.handlers.push({ config, callback });
      return channel;
    },
  );
  channel.subscribe.mockReturnValue(channel);
  return channel;
}

describe('app Realtime hook', () => {
  let queryClient: QueryClient;
  let invalidateQueries: ReturnType<typeof vi.spyOn>;
  let resetQueries: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    realtime.handlers.length = 0;
    realtime.channel.mockReset();
    realtime.removeChannel.mockClear();
    realtime.channel.mockImplementation(() => createChannel());
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    resetQueries = vi.spyOn(queryClient, 'resetQueries');
  });

  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('invalidates every transaction-backed query family', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');
    const transaction = realtime.handlers.find(({ config }) => config.table === 'transactions');
    expect(membership).toBeDefined();
    expect(transaction).toBeDefined();

    act(() =>
      transaction!.callback({
        eventType: 'INSERT',
        new: {},
        old: {},
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });

  it('evicts ledger data and invalidates the removed user’s scoped queries', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');
    expect(membership).toBeDefined();
    queryClient.setQueryData(['transactions', 'group-1'], [{ id: 'cached-entry' }]);

    act(() =>
      membership!.callback({
        eventType: 'DELETE',
        new: {},
        old: { group_id: 'group-1', user_id: 'user-1' },
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });
    expect(resetQueries).toHaveBeenCalledWith({
      queryKey: ['group', 'group-1'],
      exact: true,
    });
    expect(resetQueries).toHaveBeenCalledWith({
      queryKey: ['transactions', 'group-1'],
      exact: true,
    });
    expect(queryClient.getQueryData(['transactions', 'group-1'])).toBeUndefined();

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });

  it('refreshes a cached group when another member is removed', () => {
    queryClient.setQueryData(['groups', 'user-1'], [{ id: 'group-1' }]);
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');

    act(() =>
      membership!.callback({
        eventType: 'DELETE',
        new: {},
        old: { group_id: 'group-1', user_id: 'user-2' },
      }),
    );

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group', 'group-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['transactions', 'group-1'],
    });

    unmount();
  });

  it('ignores membership deletes from unrelated groups', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');

    act(() =>
      membership!.callback({
        eventType: 'DELETE',
        new: {},
        old: { group_id: 'unrelated-group', user_id: 'unrelated-user' },
      }),
    );

    expect(invalidateQueries).not.toHaveBeenCalled();

    unmount();
  });

  it('invalidates every profile-backed query family', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const profile = realtime.handlers.find(({ config }) => config.table === 'profiles');
    expect(profile).toBeDefined();

    act(() => profile!.callback({ eventType: 'UPDATE', new: {}, old: {} }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });

  it('invalidates every group-backed query family', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const group = realtime.handlers.find(({ config }) => config.table === 'groups');
    expect(group).toBeDefined();

    act(() => group!.callback({ eventType: 'UPDATE', new: {}, old: {} }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });
});
