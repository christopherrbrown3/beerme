import { describe, expect, it } from 'vitest';

import { type LedgerEntry } from '../types/transactions';
import { buildActivityFeed } from './activityService';

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
  it('derives group, join, transaction, and reversal events newest first', () => {
    const events = buildActivityFeed(groups, memberships, [transaction]);

    expect(events.map((event) => event.type)).toEqual([
      'transaction_reversed',
      'transaction_created',
      'member_joined',
      'group_created',
    ]);
    expect(events[0]).toMatchObject({
      title: 'Chris reversed a transaction',
      detail: 'Alex owes Chris 2 Beers',
    });
    expect(events[1]).toMatchObject({
      title: 'Alex owes Chris 2 Beers',
      detail: 'Trivia night',
    });
    expect(events[2]!.title).toBe('Alex joined Friday Crew');
    expect(events[3]!.title).toBe('Chris created Friday Crew');
  });

  it('skips orphaned records and owner join duplicates', () => {
    const events = buildActivityFeed(groups, memberships, [
      { ...transaction, groupId: 'missing-group' },
    ]);

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.type)).toEqual(['member_joined', 'group_created']);
  });
});
