import { getSupabaseClient } from '../lib/supabase';
import { getDisplayName } from '../utils/profileValidation';
import { type ActivityEvent } from '../types/activity';
import { type LedgerEntry, type LedgerProfile } from '../types/transactions';
import { formatUnitQuantity } from '../utils/unitPresentation';
import { fetchAllPages } from './pagination';
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

type ActivityProfile = {
  id: string;
  username: string;
  display_name: string | null;
};

type ActivityMembership = {
  group_id: string;
  user_id: string;
  joined_at: string;
  profile: ActivityProfile;
};

type ActivityMemberRemoval = {
  id: string;
  group_id: string;
  removed_user_id: string;
  removed_by: string;
  removed_at: string;
  removed_user: ActivityProfile | null;
  remover: ActivityProfile | null;
};

export async function getActivity(): Promise<ActivityEvent[]> {
  const supabase = getSupabaseClient();
  const [groups, memberships, transfers, removals, transactions] = await Promise.all([
    fetchAllPages<ActivityGroup>(async (from, to) => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, owner_id, created_at, currency_name, currency_plural, currency_symbol')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      return { data, error };
    }),
    fetchAllPages<ActivityMembership>(async (from, to) => {
      const { data, error } = await supabase
        .from('memberships')
        .select(
          'group_id, user_id, joined_at, profile:profiles!memberships_user_id_fkey(id, username, display_name)',
        )
        .order('joined_at', { ascending: false })
        .order('group_id')
        .order('user_id')
        .range(from, to);
      return { data: data as unknown as ActivityMembership[], error };
    }),
    getOwnerTransfers(supabase),
    getMemberRemovals(supabase),
    getAllTransactions(),
  ]);

  return buildActivityFeed(groups, memberships, transfers, transactions, removals);
}

async function getOwnerTransfers(
  supabase: ReturnType<typeof getSupabaseClient>,
): Promise<ActivityOwnerTransfer[]> {
  try {
    return await fetchAllPages<ActivityOwnerTransfer>(async (from, to) => {
      const { data, error } = await supabase
        .from('group_owner_transfers')
        .select(
          'group_id, previous_owner_id, new_owner_id, transferred_at, previous_owner:profiles!group_owner_transfers_previous_owner_id_fkey(id, username, display_name), new_owner:profiles!group_owner_transfers_new_owner_id_fkey(id, username, display_name)',
        )
        .order('transferred_at', { ascending: false })
        .order('group_id')
        .range(from, to);
      return { data: data as unknown as ActivityOwnerTransfer[], error };
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function getMemberRemovals(
  supabase: ReturnType<typeof getSupabaseClient>,
): Promise<ActivityMemberRemoval[]> {
  try {
    return await fetchAllPages<ActivityMemberRemoval>(async (from, to) => {
      const { data, error } = await supabase
        .from('group_member_removals')
        .select(
          'id, group_id, removed_user_id, removed_by, removed_at, removed_user:profiles!group_member_removals_removed_user_id_fkey(id, username, display_name), remover:profiles!group_member_removals_removed_by_fkey(id, username, display_name)',
        )
        .order('removed_at', { ascending: false })
        .order('group_id')
        .order('id')
        .range(from, to);
      return { data: data as unknown as ActivityMemberRemoval[], error };
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST205'
  );
}

type ActivityOwnerTransfer = {
  group_id: string;
  previous_owner_id: string;
  new_owner_id: string;
  transferred_at: string;
  previous_owner: ActivityProfile | null;
  new_owner: ActivityProfile | null;
};

export function buildActivityFeed(
  groups: ActivityGroup[],
  memberships: ActivityMembership[],
  transfers: ActivityOwnerTransfer[],
  transactions: LedgerEntry[],
  removals: ActivityMemberRemoval[] = [],
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

  for (const transfer of transfers) {
    const group = groupMap.get(transfer.group_id);
    if (!group || !transfer.previous_owner || !transfer.new_owner) continue;

    const actor = mapProfile(transfer.previous_owner);
    const newOwner = mapProfile(transfer.new_owner);
    events.push({
      id: `owner-transferred:${transfer.group_id}:${transfer.transferred_at}`,
      type: 'owner_transferred',
      groupId: group.id,
      groupName: group.name,
      groupSymbol: group.currency_symbol,
      actor,
      occurredAt: transfer.transferred_at,
      title: `${actor.displayName} transferred ownership to ${newOwner.displayName}`,
      detail: `${newOwner.displayName} is now the group owner.`,
    });
  }

  for (const removal of removals) {
    const group = groupMap.get(removal.group_id);
    if (!group || !removal.removed_user || !removal.remover) continue;

    const actor = mapProfile(removal.remover);
    const removedUser = mapProfile(removal.removed_user);
    events.push({
      id: `member-removed:${removal.id}`,
      type: 'member_removed',
      groupId: group.id,
      groupName: group.name,
      groupSymbol: group.currency_symbol,
      actor,
      occurredAt: removal.removed_at,
      title: `${actor.displayName} removed ${removedUser.displayName} from ${group.name}`,
      detail: `${removedUser.displayName} no longer has access to the group.`,
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
    displayName: getDisplayName(profile.display_name, profile.username),
  };
}
