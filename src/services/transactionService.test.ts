import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getGroupLedgerBalances,
  getTransactionsPage,
  TRANSACTION_PAGE_SIZE,
} from './transactionService';

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
  balances: [] as { debtor_user_id: string; creditor_user_id: string; quantity: number }[],
  limits: [] as number[],
  cursors: [] as string[],
  filters: [] as string[],
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ from: database.from, rpc: database.rpc }),
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
    database.balances = [];
    database.limits = [];
    database.cursors = [];
    database.filters = [];
    database.rpc.mockReset();
    database.rpc.mockImplementation(() =>
      Promise.resolve({ data: database.balances, error: null }),
    );
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

  it('loads one bounded, deterministically ordered ledger page', async () => {
    database.pages = [
      Array.from({ length: TRANSACTION_PAGE_SIZE + 1 }, (_, index) => transaction(index)),
    ];

    const page = await getTransactionsPage('group-1', null);

    expect(page.entries).toHaveLength(TRANSACTION_PAGE_SIZE);
    expect(page.entries.at(-1)?.id).toBe('transaction-0049');
    expect(page.nextCursor).toEqual({
      createdAt: '2026-01-01T00:00:49.000Z',
      id: 'transaction-0049',
    });
    expect(database.limits).toEqual([TRANSACTION_PAGE_SIZE + 1]);
    expect(database.filters).toEqual(['group-1']);
  });

  it('uses the supplied keyset cursor for the next bounded page', async () => {
    database.pages = [[transaction(51)]];

    await expect(
      getTransactionsPage('group-1', {
        createdAt: '2026-01-01T00:00:49.000Z',
        id: 'transaction-0049',
      }),
    ).resolves.toMatchObject({ nextCursor: null });

    expect(database.cursors).toEqual([
      'created_at.lt.2026-01-01T00:00:49.000Z,and(created_at.eq.2026-01-01T00:00:49.000Z,id.lt.transaction-0049)',
    ]);
  });
});

describe('group ledger balances', () => {
  it('maps the compact server summary into balance entries', async () => {
    database.balances = [{ debtor_user_id: 'alex', creditor_user_id: 'chris', quantity: 3 }];

    await expect(getGroupLedgerBalances('group-1')).resolves.toEqual([
      {
        debtor: { id: 'alex' },
        creditor: { id: 'chris' },
        quantity: 3,
        reversedAt: null,
      },
    ]);
    expect(database.rpc).toHaveBeenCalledWith('get_group_ledger_balances', {
      target_group_id: 'group-1',
    });
  });
});
