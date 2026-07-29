import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getGroups } from './groupService';

const database = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ rpc: database.rpc }),
}));

describe('dashboard group summaries', () => {
  beforeEach(() => {
    database.rpc.mockReset();
  });

  it('uses the caller-scoped bounded summary RPC instead of fetching ledger history', async () => {
    database.rpc.mockResolvedValue({
      data: [
        {
          id: 'group-1',
          name: 'Friday Crew',
          description: 'Neighborhood regulars',
          owner_id: 'chris',
          currency_name: 'Beer',
          currency_plural: 'Beers',
          currency_symbol: '🍺',
          created_at: '2026-07-17T00:00:00.000Z',
          member_count: 4,
          role: 'owner',
          current_user_balance: 2,
          last_activity_at: '2026-07-18T00:00:00.000Z',
        },
      ],
      error: null,
    });

    await expect(getGroups()).resolves.toEqual([
      {
        id: 'group-1',
        name: 'Friday Crew',
        description: 'Neighborhood regulars',
        ownerId: 'chris',
        inviteToken: '',
        createdAt: '2026-07-17T00:00:00.000Z',
        memberCount: 4,
        role: 'owner',
        currentUserBalance: 2,
        lastActivityAt: '2026-07-18T00:00:00.000Z',
        currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
      },
    ]);
    expect(database.rpc).toHaveBeenCalledWith('get_dashboard_group_summaries');
  });

  it('surfaces RPC failures instead of presenting a partial dashboard', async () => {
    const error = new Error('summary unavailable');
    database.rpc.mockResolvedValue({ data: null, error });

    await expect(getGroups()).rejects.toThrow('summary unavailable');
  });
});
