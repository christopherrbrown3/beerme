import { getSupabaseClient } from '../lib/supabase';
import {
  type CreateGroupInput,
  type GroupDetails,
  type GroupMember,
  type GroupSummary,
} from '../types/groups';
import { calculateUserBalance } from '../utils/balances';
import { normalizeGroupDescription, normalizeGroupName } from '../utils/groupValidation';
import { getAllTransactions } from './transactionService';

type GroupWithCount = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_token: string;
  currency_name: string;
  currency_plural: string;
  currency_symbol: string;
  created_at: string;
  memberships: { count: number }[];
};

type GroupDetailsRow = Omit<GroupWithCount, 'memberships'> & {
  memberships: Array<{
    user_id: string;
    role: GroupMember['role'];
    joined_at: string;
    profile: {
      username: string;
      display_name: string;
    };
  }>;
};

export async function getGroups(userId: string): Promise<GroupSummary[]> {
  const supabase = getSupabaseClient();
  const [groupsResult, membershipResult, transactions] = await Promise.all([
    supabase
      .from('groups')
      .select(
        `
          id, name, description, owner_id, invite_token,
          currency_name, currency_plural, currency_symbol, created_at,
          memberships(count)
        `,
      )
      .order('created_at', { ascending: false }),
    supabase.from('memberships').select('group_id, role').eq('user_id', userId),
    getAllTransactions(),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const roles = new Map(
    membershipResult.data.map((membership) => [membership.group_id, membership.role]),
  );
  const transactionsByGroup = new Map<string, typeof transactions>();
  for (const transaction of transactions) {
    const entries = transactionsByGroup.get(transaction.groupId) ?? [];
    entries.push(transaction);
    transactionsByGroup.set(transaction.groupId, entries);
  }

  return (groupsResult.data as GroupWithCount[]).map((group) => {
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
      inviteToken: group.invite_token,
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
    .select('*')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    ownerId: data.owner_id,
    inviteToken: data.invite_token,
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
  const { data, error } = await getSupabaseClient()
    .from('groups')
    .select(
      `
        id, name, description, owner_id, invite_token,
        currency_name, currency_plural, currency_symbol, created_at,
        memberships (
          user_id, role, joined_at,
          profile:profiles!memberships_user_id_fkey (username, display_name)
        )
      `,
    )
    .eq('id', groupId)
    .single();

  if (error) throw error;

  const group = data as unknown as GroupDetailsRow;
  const members = group.memberships
    .map((membership) => ({
      userId: membership.user_id,
      role: membership.role,
      joinedAt: membership.joined_at,
      username: membership.profile.username,
      displayName: membership.profile.display_name,
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    ownerId: group.owner_id,
    inviteToken: group.invite_token,
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
