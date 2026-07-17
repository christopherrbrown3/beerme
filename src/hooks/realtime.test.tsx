import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppRealtime } from './useAppRealtime';

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

describe('app Realtime hook', () => {
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

  it('invalidates every transaction-backed query family', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');
    const transaction = realtime.handlers.find(({ config }) => config.table === 'transactions');
    expect(membership).toBeDefined();
    expect(transaction).toBeDefined();

    act(() => transaction!.callback());
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });

  it('invalidates every membership-backed query family', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const membership = realtime.handlers.find(({ config }) => config.table === 'memberships');
    expect(membership).toBeDefined();

    act(() => membership!.callback());
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });

  it('invalidates every profile-backed query family', () => {
    const { unmount } = renderHook(() => useAppRealtime(), { wrapper });
    const profile = realtime.handlers.find(({ config }) => config.table === 'profiles');
    expect(profile).toBeDefined();

    act(() => profile!.callback());
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['group'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['activity'] });

    unmount();
    expect(realtime.removeChannel).toHaveBeenCalledOnce();
  });
});
