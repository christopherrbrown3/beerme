import { getSupabaseClient } from '../lib/supabase';
import { getDisplayName } from '../utils/profileValidation';
import { type ActivityEvent, type ActivityEventType } from '../types/activity';

type ActivityFeedRow = {
  event_id: string;
  event_type: ActivityEventType;
  group_id: string;
  group_name: string;
  group_symbol: string;
  actor_id: string;
  actor_username: string;
  actor_display_name: string | null;
  occurred_at: string;
  title: string;
  detail: string | null;
};

/**
 * The database combines, orders, and caps the feed before it crosses the
 * network boundary. This stays bounded even when a group has years of ledger
 * history.
 */
export async function getActivity(): Promise<ActivityEvent[]> {
  const { data, error } = await getSupabaseClient().rpc('get_activity_feed');
  if (error) throw error;

  return ((data ?? []) as ActivityFeedRow[]).map((event) => ({
    id: event.event_id,
    type: event.event_type,
    groupId: event.group_id,
    groupName: event.group_name,
    groupSymbol: event.group_symbol,
    actor: {
      id: event.actor_id,
      username: event.actor_username,
      displayName: getDisplayName(event.actor_display_name, event.actor_username),
    },
    occurredAt: event.occurred_at,
    title: event.title,
    detail: event.detail,
  }));
}
