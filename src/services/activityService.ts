import { getSupabaseClient } from '../lib/supabase';
import { type ActivityEvent } from '../types/activity';
import { type LedgerEntry, type LedgerProfile } from '../types/transactions';
import { formatUnitQuantity } from '../utils/unitPresentation';
import { getAllTransactions } from './transactionService';

type ActivityGroup = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  currency_name: string;
  currency_plural: string;
  currency_symbol: string;
};

type ActivityMembership = {
  group_id: string;
  user_id: string;
  joined_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
  };
};

export async function getActivity(): Promise<ActivityEvent[]> {
  const supabase = getSupabaseClient();
  const [groupsResult, membershipsResult, transactions] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, owner_id, created_at, currency_name, currency_plural, currency_symbol'),
    supabase
      .from('memberships')
      .select(
        'group_id, user_id, joined_at, profile:profiles!memberships_user_id_fkey(id, username, display_name)',
      ),
    getAllTransactions(),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  return buildActivityFeed(
    groupsResult.data as ActivityGroup[],
    membershipsResult.data as unknown as ActivityMembership[],
    transactions,
  );
}

export function buildActivityFeed(
  groups: ActivityGroup[],
  memberships: ActivityMembership[],
  transactions: LedgerEntry[],
): ActivityEvent[] {
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const events: ActivityEvent[] = [];

  for (const group of groups) {
    const ownerMembership = memberships.find(
      (membership) => membership.group_id === group.id && membership.user_id === group.owner_id,
    );
    if (!ownerMembership) continue;

    const actor = mapProfile(ownerMembership.profile);
    events.push({
      id: `group-created:${group.id}`,
      type: 'group_created',
      groupId: group.id,
      groupName: group.name,
      groupSymbol: group.currency_symbol,
      actor,
      occurredAt: group.created_at,
      title: `${actor.displayName} created ${group.name}`,
      detail: 'The group ledger opened.',
    });
  }

  for (const membership of memberships) {
    const group = groupMap.get(membership.group_id);
    if (!group || membership.user_id === group.owner_id) continue;

    const actor = mapProfile(membership.profile);
    events.push({
      id: `member-joined:${membership.group_id}:${membership.user_id}`,
      type: 'member_joined',
      groupId: group.id,
      groupName: group.name,
      groupSymbol: group.currency_symbol,
      actor,
      occurredAt: membership.joined_at,
      title: `${actor.displayName} joined ${group.name}`,
      detail: 'A new friend joined the ledger.',
    });
  }

  for (const transaction of transactions) {
    const group = groupMap.get(transaction.groupId);
    if (!group) continue;
    const currency = {
      name: group.currency_name,
      plural: group.currency_plural,
      symbol: group.currency_symbol,
    };
    const relationship = `${transaction.debtor.displayName} owes ${transaction.creditor.displayName} ${formatUnitQuantity(transaction.quantity, currency)}`;

    events.push({
      id: `transaction-created:${transaction.id}`,
      type: 'transaction_created',
      groupId: group.id,
      groupName: group.name,
      groupSymbol: group.currency_symbol,
      actor: transaction.createdBy,
      occurredAt: transaction.createdAt,
      title: relationship,
      detail: transaction.note,
    });

    if (transaction.reversedAt && transaction.reversedBy) {
      events.push({
        id: `transaction-reversed:${transaction.id}`,
        type: 'transaction_reversed',
        groupId: group.id,
        groupName: group.name,
        groupSymbol: group.currency_symbol,
        actor: transaction.reversedBy,
        occurredAt: transaction.reversedAt,
        title: `${transaction.reversedBy.displayName} reversed a transaction`,
        detail: relationship,
      });
    }
  }

  return events
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
    .slice(0, 100);
}

function mapProfile(profile: ActivityMembership['profile']): LedgerProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
  };
}
