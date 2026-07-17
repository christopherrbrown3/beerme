import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLedgerRealtime } from './useGroupLedger';
import { useGroupsRealtime } from './useGroups';

type RealtimeConfig = { table: string; filter?: string };

const realtime = vi.hoisted(() => ({
  handlers: [] as Array<{ config: RealtimeConfig; callback: () => void }>,
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
  channel.on.mockImplementation((_event: string, config: RealtimeConfig, callback: () => void) => {
    realtime.handlers.push({ config, callback });
    return channel;
  });
  channel.subscribe.mockReturnValue(channel);
  return channel;
}

describe('membership Realtime hooks', () => {
  let queryClient: QueryClient;
  let invalidateQueries: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    realtime.handlers.length = 0;
    realtime.channel.mockReset();
    realtime.removeChannel.mockClear();
    realtime.channel.mockImplementation(() => createChannel());
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  });

  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('refreshes dashboard summaries when membership or transaction data changes', () => {
    const { unmount } = renderHook(() => useGroupsRealtime(), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');
    const transaction = realtime.handlers.find(({ config }) => config.table === 'transactions');
    expect(membership).toBeDefined();
    expect(transaction).toBeDefined();

    act(() => membership!.callback());
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });
    invalidateQueries.mockClear();

    act(() => transaction!.callback());
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });

  it('refreshes the affected ledger and summaries when a member joins', () => {
    const { unmount } = renderHook(() => useLedgerRealtime('group-1'), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');
    expect(membership?.config.filter).toBe('group_id=eq.group-1');

    act(() => membership!.callback());
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group', 'group-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });
});
