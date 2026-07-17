import { getSupabaseClient } from '../lib/supabase';
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
  debtor: { id: string; username: string; display_name: string };
  creditor: { id: string; username: string; display_name: string };
  creator: { id: string; username: string; display_name: string };
  reverser: { id: string; username: string; display_name: string } | null;
};

function mapTransaction(row: TransactionRow): LedgerEntry {
  return {
    id: row.id,
    groupId: row.group_id,
    debtor: {
      id: row.debtor.id,
      username: row.debtor.username,
      displayName: row.debtor.display_name,
    },
    creditor: {
      id: row.creditor.id,
      username: row.creditor.username,
      displayName: row.creditor.display_name,
    },
    quantity: Number(row.quantity),
    note: row.note,
    createdBy: {
      id: row.creator.id,
      username: row.creator.username,
      displayName: row.creator.display_name,
    },
    createdAt: row.created_at,
    reversedAt: row.reversed_at,
    reversedBy: row.reverser
      ? {
          id: row.reverser.id,
          username: row.reverser.username,
          displayName: row.reverser.display_name,
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

  for (let from = 0; ; from += TRANSACTION_PAGE_SIZE) {
    let query = getSupabaseClient()
      .from('transactions')
      .select(TRANSACTION_SELECT)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (groupId) query = query.eq('group_id', groupId);

    const { data, error } = await query.range(from, from + TRANSACTION_PAGE_SIZE - 1);
    if (error) throw error;

    const page = data as unknown as TransactionRow[];
    rows.push(...page);
    if (page.length < TRANSACTION_PAGE_SIZE) break;
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
