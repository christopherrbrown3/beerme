import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getActivity } from './activityService';

const activityDatabase = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ rpc: activityDatabase.rpc }),
}));

describe('getActivity', () => {
  beforeEach(() => activityDatabase.rpc.mockReset());

  it('uses one bounded feed RPC and maps only Activity UI fields', async () => {
    activityDatabase.rpc.mockResolvedValue({
      data: [
        {
          event_id: 'transaction-created:entry-1',
          event_type: 'transaction_created',
          group_id: 'group-1',
          group_name: 'Friday Crew',
          group_symbol: '🍺',
          actor_id: 'chris',
          actor_username: 'chris',
          actor_display_name: '',
          occurred_at: '2026-07-29T10:00:00.000Z',
          title: 'Alex owes Chris 2 Beers',
          detail: 'Trivia night',
        },
      ],
      error: null,
    });

    await expect(getActivity()).resolves.toEqual([
      {
        id: 'transaction-created:entry-1',
        type: 'transaction_created',
        groupId: 'group-1',
        groupName: 'Friday Crew',
        groupSymbol: '🍺',
        actor: { id: 'chris', username: 'chris', displayName: 'chris' },
        occurredAt: '2026-07-29T10:00:00.000Z',
        title: 'Alex owes Chris 2 Beers',
        detail: 'Trivia night',
      },
    ]);
    expect(activityDatabase.rpc).toHaveBeenCalledOnce();
    expect(activityDatabase.rpc).toHaveBeenCalledWith('get_activity_feed');
  });

  it('surfaces RPC failures instead of showing a partial timeline', async () => {
    const error = { code: '42501', message: 'permission denied' };
    activityDatabase.rpc.mockResolvedValue({ data: null, error });

    await expect(getActivity()).rejects.toEqual(error);
  });
});
