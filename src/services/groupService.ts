import { getSupabaseClient } from '../lib/supabase';
import { getDisplayName } from '../utils/profileValidation';
import {
  type CreateGroupInput,
  type GroupCurrency,
  type GroupDetails,
  type GroupMember,
  type GroupSummary,
} from '../types/groups';
import { calculateUserBalance } from '../utils/balances';
import {
  normalizeCurrencyValue,
  normalizeGroupDescription,
  normalizeGroupName,
} from '../utils/groupValidation';
import { fetchAllPages } from './pagination';
import { getAllTransactions } from './transactionService';

type GroupWithCount = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  currency_name: string;
  currency_plural: string;
  currency_symbol: string;
  created_at: string;
  memberships: { count: number }[];
};

type GroupDetailsRow = Omit<GroupWithCount, 'memberships'>;

type GroupMembershipRow = {
  user_id: string;
  role: GroupMember['role'];
  joined_at: string;
  profile: {
    username: string;
    display_name: string | null;
  };
};

export async function getGroups(userId: string): Promise<GroupSummary[]> {
  const supabase = getSupabaseClient();
  const [groups, memberships, transactions] = await Promise.all([
    fetchAllPages<GroupWithCount>(async (from, to) => {
      const { data, error } = await supabase
        .from('groups')
        .select(
          `
            id, name, description, owner_id,
            currency_name, currency_plural, currency_symbol, created_at,
            memberships(count)
          `,
        )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      return { data: data as unknown as GroupWithCount[], error };
    }),
    fetchAllPages<{ group_id: string; role: GroupMember['role'] }>(async (from, to) => {
      const { data, error } = await supabase
        .from('memberships')
        .select('group_id, role')
        .eq('user_id', userId)
        .order('group_id')
        .range(from, to);
      return { data, error };
    }),
    getAllTransactions(),
  ]);

  const roles = new Map(memberships.map((membership) => [membership.group_id, membership.role]));
  const transactionsByGroup = new Map<string, typeof transactions>();
  for (const transaction of transactions) {
    const entries = transactionsByGroup.get(transaction.groupId) ?? [];
    entries.push(transaction);
    transactionsByGroup.set(transaction.groupId, entries);
  }

  return groups.map((group) => {
    const groupTransactions = transactionsByGroup.get(group.id) ?? [];
    const activityDates = groupTransactions.flatMap((transaction) =>
      transaction.reversedAt
        ? [transaction.createdAt, transaction.reversedAt]
        : [transaction.createdAt],
    );

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.owner_id,
      inviteToken: '',
      createdAt: group.created_at,
      memberCount: group.memberships[0]?.count ?? 0,
      role: roles.get(group.id) ?? 'member',
      currentUserBalance: calculateUserBalance(groupTransactions, userId).net,
      lastActivityAt:
        activityDates.length > 0
          ? activityDates.reduce((latest, current) => (current > latest ? current : latest))
          : null,
      currency: {
        name: group.currency_name,
        plural: group.currency_plural,
        symbol: group.currency_symbol,
      },
    };
  });
}

export async function createGroup(userId: string, input: CreateGroupInput): Promise<GroupSummary> {
  const { data, error } = await getSupabaseClient()
    .from('groups')
    .insert({
      name: normalizeGroupName(input.name),
      description: normalizeGroupDescription(input.description),
      owner_id: userId,
    })
    .select(
      'id, name, description, owner_id, currency_name, currency_plural, currency_symbol, created_at',
    )
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    ownerId: data.owner_id,
    inviteToken: '',
    createdAt: data.created_at,
    memberCount: 1,
    role: 'owner',
    currentUserBalance: 0,
    lastActivityAt: null,
    currency: {
      name: data.currency_name,
      plural: data.currency_plural,
      symbol: data.currency_symbol,
    },
  };
}

export async function getGroupDetails(groupId: string, userId: string): Promise<GroupDetails> {
  const supabase = getSupabaseClient();
  const [groupResult, memberships] = await Promise.all([
    supabase
      .from('groups')
      .select(
        `
          id, name, description, owner_id,
          currency_name, currency_plural, currency_symbol, created_at
        `,
      )
      .eq('id', groupId)
      .single(),
    fetchAllPages<GroupMembershipRow>(async (from, to) => {
      const { data, error } = await supabase
        .from('memberships')
        .select(
          'user_id, role, joined_at, profile:profiles!memberships_user_id_fkey(username, display_name)',
        )
        .eq('group_id', groupId)
        .order('joined_at')
        .order('user_id')
        .range(from, to);
      return { data: data as unknown as GroupMembershipRow[], error };
    }),
  ]);

  if (groupResult.error) throw groupResult.error;

  const group = groupResult.data as unknown as GroupDetailsRow;
  const members = memberships
    .map((membership) => ({
      userId: membership.user_id,
      role: membership.role,
      joinedAt: membership.joined_at,
      username: membership.profile.username,
      displayName: getDisplayName(membership.profile.display_name, membership.profile.username),
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });

  const inviteToken = group.owner_id === userId ? await getGroupInviteToken(groupId) : '';

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    ownerId: group.owner_id,
    inviteToken,
    createdAt: group.created_at,
    memberCount: members.length,
    role: members.find((member) => member.userId === userId)?.role ?? 'member',
    currency: {
      name: group.currency_name,
      plural: group.currency_plural,
      symbol: group.currency_symbol,
    },
    members,
  };
}

export async function joinGroup(token: string) {
  const { data, error } = await getSupabaseClient().rpc('join_group', { token });

  if (error) throw error;
  return data;
}

async function getGroupInviteToken(groupId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_group_invite_token', {
    target_group_id: groupId,
  });

  if (!error) return data;

  if (error.code !== 'PGRST202') throw error;

  // Keep owners from losing the Invite control during the short interval between a web deploy and
  // its matching migration. The legacy column is removed atomically with the new RPC.
  const legacyInviteResult = await supabase
    .from('groups')
    .select('invite_token')
    .eq('id', groupId)
    .single();

  if (legacyInviteResult.error) throw legacyInviteResult.error;

  return (legacyInviteResult.data as unknown as { invite_token: string }).invite_token;
}

export async function rotateGroupInvite(groupId: string) {
  const { data, error } = await getSupabaseClient().rpc('rotate_group_invite', {
    target_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function updateGroupCurrency(groupId: string, currency: GroupCurrency) {
  const { data, error } = await getSupabaseClient()
    .from('groups')
    .update({
      currency_name: normalizeCurrencyValue(currency.name),
      currency_plural: normalizeCurrencyValue(currency.plural),
      currency_symbol: normalizeCurrencyValue(currency.symbol),
    })
    .eq('id', groupId)
    .select('currency_name, currency_plural, currency_symbol')
    .single();

  if (error) throw error;

  return {
    name: data.currency_name,
    plural: data.currency_plural,
    symbol: data.currency_symbol,
  } satisfies GroupCurrency;
}

export async function leaveGroup(groupId: string) {
  const { error } = await getSupabaseClient().rpc('leave_group', { target_group_id: groupId });
  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await getSupabaseClient().rpc('delete_group', { target_group_id: groupId });
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, targetUserId: string) {
  const { error } = await getSupabaseClient().rpc('remove_group_member', {
    target_group_id: groupId,
    target_user_id: targetUserId,
  });

  if (error) throw error;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error !== 'object' || error === null || !('message' in error)) return '';

  return typeof error.message === 'string' ? error.message : '';
}

export function getFriendlyTransferOwnershipError(error: unknown) {
  const message = getErrorMessage(error);

  if (/authentication is required|jwt|session/i.test(message)) {
    return 'Your session expired. Sign in again, then retry the transfer.';
  }

  if (/only the current group owner/i.test(message)) {
    return 'You are no longer this group’s owner. Refresh the group to see its current owner.';
  }

  if (/target user is not a member/i.test(message)) {
    return 'That person is no longer a group member. Refresh the group and choose another member.';
  }

  if (/cannot transfer ownership to the current owner/i.test(message)) {
    return 'Choose a different group member as the new owner.';
  }

  if (
    error instanceof TypeError ||
    /failed to fetch|network(?:error| request failed)/i.test(message)
  ) {
    return 'We couldn’t reach BeerMe. Check your connection and try again.';
  }

  return 'BeerMe couldn’t complete the transfer. Refresh the group and try again.';
}

export function getFriendlyRemoveMemberError(error: unknown) {
  const message = getErrorMessage(error);

  if (/authentication is required|jwt|session/i.test(message)) {
    return 'Your session expired. Sign in again, then retry the removal.';
  }

  if (/only the current group owner/i.test(message)) {
    return 'You are no longer this group’s owner. Refresh the group to see its current owner.';
  }

  if (/target user is not a member/i.test(message)) {
    return 'That person is no longer a group member. Refresh the group to see who remains.';
  }

  if (/group owner cannot be removed/i.test(message)) {
    return 'Transfer ownership before removing the current owner.';
  }

  if (
    error instanceof TypeError ||
    /failed to fetch|network(?:error| request failed)/i.test(message)
  ) {
    return 'We couldn’t reach BeerMe. Check your connection and try again.';
  }

  return 'BeerMe couldn’t remove that member. Refresh the group and try again.';
}

export function getFriendlyRotateInviteError(error: unknown) {
  const message = getErrorMessage(error);

  if (/authentication is required|jwt|session/i.test(message)) {
    return 'Your session expired. Sign in again, then try rotating the invite.';
  }

  if (/only the current group owner/i.test(message)) {
    return 'You are no longer this group’s owner. Refresh the group to see who can manage invites.';
  }

  if (/wait a minute before rotating/i.test(message)) {
    return 'You just rotated this invite. Please wait a minute before doing it again.';
  }

  if (
    error instanceof TypeError ||
    /failed to fetch|network(?:error| request failed)/i.test(message)
  ) {
    return 'We couldn’t reach BeerMe. Check your connection and try again.';
  }

  return 'BeerMe couldn’t rotate that invite. Refresh the group and try again.';
}

export async function transferGroupOwnership(groupId: string, targetUserId: string) {
  const { error } = await getSupabaseClient().rpc('transfer_group_ownership', {
    target_group_id: groupId,
    target_user_id: targetUserId,
  });

  if (error) throw error;
}
