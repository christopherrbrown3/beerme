import { getSupabaseClient } from '../lib/supabase';
import { type CreateGroupInput, type GroupSummary } from '../types/groups';
import { normalizeGroupDescription, normalizeGroupName } from '../utils/groupValidation';

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

export async function getGroups(userId: string): Promise<GroupSummary[]> {
  const supabase = getSupabaseClient();
  const [groupsResult, membershipResult] = await Promise.all([
    supabase
      .from('groups')
      .select(
        'id, name, description, owner_id, invite_token, currency_name, currency_plural, currency_symbol, created_at, memberships(count)',
      )
      .order('created_at', { ascending: false }),
    supabase.from('memberships').select('group_id, role').eq('user_id', userId),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const roles = new Map(
    membershipResult.data.map((membership) => [membership.group_id, membership.role]),
  );

  return (groupsResult.data as GroupWithCount[]).map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    ownerId: group.owner_id,
    inviteToken: group.invite_token,
    createdAt: group.created_at,
    memberCount: group.memberships[0]?.count ?? 0,
    role: roles.get(group.id) ?? 'member',
    currency: {
      name: group.currency_name,
      plural: group.currency_plural,
      symbol: group.currency_symbol,
    },
  }));
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
    currency: {
      name: data.currency_name,
      plural: data.currency_plural,
      symbol: data.currency_symbol,
    },
  };
}

export async function joinGroup(token: string) {
  const { data, error } = await getSupabaseClient().rpc('join_group', { token });

  if (error) throw error;
  return data;
}
