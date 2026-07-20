import { type LedgerProfile } from './transactions';

export type ActivityEventType =
  | 'group_created'
  | 'member_joined'
  | 'owner_transferred'
  | 'transaction_created'
  | 'transaction_reversed';

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  groupId: string;
  groupName: string;
  groupSymbol: string;
  actor: LedgerProfile;
  occurredAt: string;
  title: string;
  detail: string | null;
};
