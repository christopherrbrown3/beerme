import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTransactions } from './transactionService';

type TransactionFixture = {
  id: string;
  group_id: string;
  quantity: number;
  note: null;
  created_at: string;
  reversed_at: null;
  debtor: { id: string; username: string; display_name: string };
  creditor: { id: string; username: string; display_name: string };
  creator: { id: string; username: string; display_name: string };
  reverser: null;
};

const database = vi.hoisted(() => ({
  pages: [] as TransactionFixture[][],
  limits: [] as number[],
  cursors: [] as string[],
  filters: [] as string[],
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ from: database.from }),
}));

function transaction(index: number): TransactionFixture {
  const profile = (id: string) => ({ id, username: id, display_name: id });
  return {
    id: `transaction-${index.toString().padStart(4, '0')}`,
    group_id: 'group-1',
    quantity: 1,
    note: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    reversed_at: null,
    debtor: profile('debtor'),
    creditor: profile('creditor'),
    creator: profile('creator'),
    reverser: null,
  };
}

describe('transaction pagination', () => {
  beforeEach(() => {
    database.pages = [];
    database.limits = [];
    database.cursors = [];
    database.filters = [];
    database.from.mockReset();
    database.from.mockImplementation(() => {
      const builder = {
        select: vi.fn(),
        order: vi.fn(),
        eq: vi.fn(),
        or: vi.fn(),
        limit: vi.fn(),
      };
      builder.select.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      builder.eq.mockImplementation((_column: string, value: string) => {
        database.filters.push(value);
        return builder;
      });
      builder.or.mockImplementation((cursor: string) => {
        database.cursors.push(cursor);
        return builder;
      });
      builder.limit.mockImplementation((limit: number) => {
        database.limits.push(limit);
        return Promise.resolve({ data: database.pages.shift() ?? [], error: null });
      });
      return builder;
    });
  });

  it('keeps requesting deterministic pages until the ledger is exhausted', async () => {
    database.pages = [
      Array.from({ length: 1_000 }, (_, index) => transaction(index)),
      [transaction(1_000)],
    ];

    const entries = await getTransactions('group-1');

    expect(entries).toHaveLength(1_001);
    expect(entries.at(-1)?.id).toBe('transaction-1000');
    expect(database.limits).toEqual([1_000, 1_000]);
    expect(database.filters).toEqual(['group-1', 'group-1']);
    expect(database.cursors).toEqual([
      'created_at.lt.2026-01-01T00:16:39.000Z,and(created_at.eq.2026-01-01T00:16:39.000Z,id.lt.transaction-0999)',
    ]);
  });
});
