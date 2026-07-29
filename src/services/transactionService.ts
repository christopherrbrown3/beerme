import { getSupabaseClient } from '../lib/supabase';
import { type BalanceEntry } from '../types/balances';
import { getDisplayName } from '../utils/profileValidation';
import {
  type CreateTransactionInput,
  type LedgerEntry,
  type SettleUpInput,
  type TransactionKind,
} from '../types/transactions';
import { normalizeTransactionNote } from '../utils/transactionValidation';

const TRANSACTION_SELECT = `
  id, group_id, kind, debtor_user_id, creditor_user_id, quantity, note,
  created_by, created_at, reversed_at, reversed_by,
  debtor:profiles!transactions_debtor_user_id_fkey (id, username, display_name),
  creditor:profiles!transactions_creditor_user_id_fkey (id, username, display_name),
  creator:profiles!transactions_created_by_fkey (id, username, display_name),
  reverser:profiles!transactions_reversed_by_fkey (id, username, display_name)
`;
export const TRANSACTION_PAGE_SIZE = 50;
const FULL_TRANSACTION_PAGE_SIZE = 1_000;

export type TransactionCursor = {
  createdAt: string;
  id: string;
};

export type TransactionPage = {
  entries: LedgerEntry[];
  nextCursor: TransactionCursor | null;
};

type TransactionRow = {
  id: string;
  group_id: string;
  kind: TransactionKind;
  quantity: number;
  note: string | null;
  created_at: string;
  reversed_at: string | null;
  debtor: { id: string; username: string; display_name: string | null };
  creditor: { id: string; username: string; display_name: string | null };
  creator: { id: string; username: string; display_name: string | null };
  reverser: { id: string; username: string; display_name: string | null } | null;
};

type LedgerBalanceRow = {
  debtor_user_id: string;
  creditor_user_id: string;
  quantity: number;
};

function mapTransaction(row: TransactionRow): LedgerEntry {
  return {
    id: row.id,
    groupId: row.group_id,
    kind: row.kind,
    debtor: {
      id: row.debtor.id,
      username: row.debtor.username,
      displayName: getDisplayName(row.debtor.display_name, row.debtor.username),
    },
    creditor: {
      id: row.creditor.id,
      username: row.creditor.username,
      displayName: getDisplayName(row.creditor.display_name, row.creditor.username),
    },
    quantity: Number(row.quantity),
    note: row.note,
    createdBy: {
      id: row.creator.id,
      username: row.creator.username,
      displayName: getDisplayName(row.creator.display_name, row.creator.username),
    },
    createdAt: row.created_at,
    reversedAt: row.reversed_at,
    reversedBy: row.reverser
      ? {
          id: row.reverser.id,
          username: row.reverser.username,
          displayName: getDisplayName(row.reverser.display_name, row.reverser.username),
        }
      : null,
  };
}

export async function getTransactionsPage(
  groupId: string,
  cursor: TransactionCursor | null,
): Promise<TransactionPage> {
  let query = getSupabaseClient()
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  // Request one extra row so the UI can offer an explicit next page without a count query.
  const { data, error } = await query.limit(TRANSACTION_PAGE_SIZE + 1);
  if (error) throw error;

  const rows = data as unknown as TransactionRow[];
  const nextRow = rows.at(TRANSACTION_PAGE_SIZE);

  return {
    entries: rows.slice(0, TRANSACTION_PAGE_SIZE).map(mapTransaction),
    nextCursor: nextRow
      ? {
          createdAt: rows[TRANSACTION_PAGE_SIZE - 1]!.created_at,
          id: rows[TRANSACTION_PAGE_SIZE - 1]!.id,
        }
      : null,
  };
}

export async function getGroupLedgerBalances(groupId: string): Promise<BalanceEntry[]> {
  const { data, error } = await getSupabaseClient().rpc('get_group_ledger_balances', {
    target_group_id: groupId,
  });

  if (error) throw error;

  return ((data ?? []) as LedgerBalanceRow[]).map((row) => ({
    debtor: { id: row.debtor_user_id },
    creditor: { id: row.creditor_user_id },
    quantity: Number(row.quantity),
    reversedAt: null,
  }));
}

// Dashboard aggregation is intentionally left on its existing path until #72 replaces it with a
// bounded server-side summary. Group ledgers must never call this helper.
export async function getAllTransactions(): Promise<LedgerEntry[]> {
  const rows: TransactionRow[] = [];
  let cursor: Pick<TransactionRow, 'created_at' | 'id'> | undefined;

  for (;;) {
    let query = getSupabaseClient()
      .from('transactions')
      .select(TRANSACTION_SELECT)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query.limit(FULL_TRANSACTION_PAGE_SIZE);
    if (error) throw error;

    const page = data as unknown as TransactionRow[];
    rows.push(...page);
    if (page.length < FULL_TRANSACTION_PAGE_SIZE) return rows.map(mapTransaction);
    cursor = page.at(-1);
  }
}

export async function addTransaction(userId: string, input: CreateTransactionInput) {
  const { data, error } = await getSupabaseClient()
    .from('transactions')
    .insert({
      group_id: input.groupId,
      debtor_user_id: input.debtorUserId,
      creditor_user_id: input.creditorUserId,
      quantity: input.quantity,
      note: normalizeTransactionNote(input.note),
      created_by: userId,
    })
    .select(TRANSACTION_SELECT)
    .single();

  if (error) throw error;
  return mapTransaction(data as unknown as TransactionRow);
}

export async function reverseTransaction(transactionId: string) {
  const { data, error } = await getSupabaseClient().rpc('reverse_transaction', {
    transaction_id: transactionId,
  });

  if (error) throw error;
  return data;
}

export async function settleUp(input: SettleUpInput) {
  const { data, error } = await getSupabaseClient().rpc('settle_up', {
    target_group_id: input.groupId,
    target_creditor_user_id: input.creditorUserId,
    settlement_quantity: input.quantity,
  });

  if (error) throw error;
  return data;
}
