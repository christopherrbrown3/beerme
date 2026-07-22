import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type LedgerEntry } from '../types/transactions';
import { buildActivityFeed, getActivity } from './activityService';

const activityDatabase = vi.hoisted(() => ({
  from: vi.fn(),
  ownerTransferError: null as null | { code: string; message: string },
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ from: activityDatabase.from }),
}));

vi.mock('./transactionService', () => ({
  getAllTransactions: vi.fn(async () => []),
}));

const groups = [
  {
    id: 'group-1',
    name: 'Friday Crew',
    owner_id: 'chris',
    created_at: '2026-07-17T10:00:00.000Z',
    currency_name: 'Beer',
    currency_plural: 'Beers',
    currency_symbol: '🍺',
  },
];

const memberships = [
  {
    group_id: 'group-1',
    user_id: 'chris',
    joined_at: '2026-07-17T10:00:00.000Z',
    profile: { id: 'chris', username: 'chris', display_name: 'Chris' },
  },
  {
    group_id: 'group-1',
    user_id: 'alex',
    joined_at: '2026-07-17T11:00:00.000Z',
    profile: { id: 'alex', username: 'alex', display_name: 'Alex' },
  },
];

const transaction: LedgerEntry = {
  id: 'transaction-1',
  groupId: 'group-1',
  debtor: { id: 'alex', username: 'alex', displayName: 'Alex' },
  creditor: { id: 'chris', username: 'chris', displayName: 'Chris' },
  quantity: 2,
  note: 'Trivia night',
  createdBy: { id: 'chris', username: 'chris', displayName: 'Chris' },
  createdAt: '2026-07-17T12:00:00.000Z',
  reversedAt: '2026-07-17T13:00:00.000Z',
  reversedBy: { id: 'chris', username: 'chris', displayName: 'Chris' },
};

describe('buildActivityFeed', () => {
  it('derives group, join, transfer, transaction, and reversal events newest first', () => {
    const transfer = {
      group_id: 'group-1',
      previous_owner_id: 'chris',
      new_owner_id: 'alex',
      transferred_at: '2026-07-17T12:30:00.000Z',
      previous_owner: { id: 'chris', username: 'chris', display_name: 'Chris' },
      new_owner: { id: 'alex', username: 'alex', display_name: 'Alex' },
    };

    const events = buildActivityFeed(groups, memberships, [transfer], [transaction]);

    expect(events.map((event) => event.type)).toEqual([
      'transaction_reversed',
      'owner_transferred',
      'transaction_created',
      'member_joined',
      'group_created',
    ]);
    expect(events[0]).toMatchObject({
      title: 'Chris reversed a transaction',
      detail: 'Alex owes Chris 2 Beers',
    });
    expect(events[1]).toMatchObject({
      title: 'Chris transferred ownership to Alex',
      detail: 'Alex is now the group owner.',
    });
    expect(events[2]).toMatchObject({
      title: 'Alex owes Chris 2 Beers',
      detail: 'Trivia night',
    });
    expect(events[3]!.title).toBe('Alex joined Friday Crew');
    expect(events[4]!.title).toBe('Chris created Friday Crew');
  });

  it('skips orphaned records and owner join duplicates', () => {
    const events = buildActivityFeed(
      groups,
      memberships,
      [],
      [{ ...transaction, groupId: 'missing-group' }],
    );

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.type)).toEqual(['member_joined', 'group_created']);
  });

  it('skips ownership transfers whose related profiles are hidden by row-level security', () => {
    const events = buildActivityFeed(
      groups,
      memberships,
      [
        {
          group_id: 'group-1',
          previous_owner_id: 'chris',
          new_owner_id: 'alex',
          transferred_at: '2026-07-17T12:30:00.000Z',
          previous_owner: { id: 'chris', username: 'chris', display_name: 'Chris' },
          new_owner: null,
        },
      ],
      [transaction],
    );

    expect(events.some((event) => event.type === 'owner_transferred')).toBe(false);
    expect(events.some((event) => event.type === 'transaction_created')).toBe(true);
  });
});

describe('getActivity', () => {
  beforeEach(() => {
    activityDatabase.ownerTransferError = null;
    activityDatabase.from.mockReset();
    activityDatabase.from.mockImplementation((table: string) => {
      const builder = {
        select: vi.fn(),
        order: vi.fn(),
        range: vi.fn(),
      };
      builder.select.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      builder.range.mockResolvedValue({
        data: [],
        error: table === 'group_owner_transfers' ? activityDatabase.ownerTransferError : null,
      });
      return builder;
    });
  });

  it('loads core activity when the optional ownership-transfer table is not deployed', async () => {
    activityDatabase.ownerTransferError = {
      code: 'PGRST205',
      message: "Could not find the table 'public.group_owner_transfers' in the schema cache",
    };

    await expect(getActivity()).resolves.toEqual([]);
  });

  it('still reports unexpected ownership-transfer query failures', async () => {
    activityDatabase.ownerTransferError = {
      code: '42501',
      message: 'permission denied for table group_owner_transfers',
    };

    await expect(getActivity()).rejects.toMatchObject({ code: '42501' });
  });
});
