import { type MembershipRole } from './database';

type GroupBase = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  inviteToken: string;
  createdAt: string;
  memberCount: number;
  role: MembershipRole;
  currency: GroupCurrency;
};

export type GroupCurrency = {
  name: string;
  plural: string;
  symbol: string;
};

export type GroupSummary = GroupBase & {
  currentUserBalance: number;
  lastActivityAt: string | null;
};

export type CreateGroupInput = {
  name: string;
  description: string;
};

export type GroupMember = {
  userId: string;
  role: MembershipRole;
  joinedAt: string;
  username: string;
  displayName: string;
};

export type GroupDetails = GroupBase & {
  members: GroupMember[];
};
