import { getSupabaseClient } from '../lib/supabase';
import { getDisplayName } from '../utils/profileValidation';
import { type CreateTransactionInput, type LedgerEntry } from '../types/transactions';
import { normalizeTransactionNote } from '../utils/transactionValidation';

const TRANSACTION_SELECT = `
  id, group_id, debtor_user_id, creditor_user_id, quantity, note,
  created_by, created_at, reversed_at, reversed_by,
  debtor:profiles!transactions_debtor_user_id_fkey (id, username, display_name),
  creditor:profiles!transactions_creditor_user_id_fkey (id, username, display_name),
  creator:profiles!transactions_created_by_fkey (id, username, display_name),
  reverser:profiles!transactions_reversed_by_fkey (id, username, display_name)
`;
const TRANSACTION_PAGE_SIZE = 1_000;

type TransactionRow = {
  id: string;
  group_id: string;
  quantity: number;
  note: string | null;
  created_at: string;
  reversed_at: string | null;
  debtor: { id: string; username: string; display_name: string | null };
  creditor: { id: string; username: string; display_name: string | null };
  creator: { id: string; username: string; display_name: string | null };
  reverser: { id: string; username: string; display_name: string | null } | null;
};

function mapTransaction(row: TransactionRow): LedgerEntry {
  return {
    id: row.id,
    groupId: row.group_id,
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

export async function getTransactions(groupId: string): Promise<LedgerEntry[]> {
  return queryTransactions(groupId);
}

export async function getAllTransactions(): Promise<LedgerEntry[]> {
  return queryTransactions();
}

async function queryTransactions(groupId?: string): Promise<LedgerEntry[]> {
  const rows: TransactionRow[] = [];
  let cursor: Pick<TransactionRow, 'created_at' | 'id'> | undefined;

  for (;;) {
    let query = getSupabaseClient()
      .from('transactions')
      .select(TRANSACTION_SELECT)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (groupId) query = query.eq('group_id', groupId);
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query.limit(TRANSACTION_PAGE_SIZE);
    if (error) throw error;

    const page = data as unknown as TransactionRow[];
    rows.push(...page);
    if (page.length < TRANSACTION_PAGE_SIZE) break;
    cursor = page.at(-1);
  }

  return rows.map(mapTransaction);
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
