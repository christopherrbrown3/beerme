import { type MembershipRole } from './database';

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  inviteToken: string;
  createdAt: string;
  memberCount: number;
  role: MembershipRole;
  currency: {
    name: string;
    plural: string;
    symbol: string;
  };
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

export type GroupDetails = GroupSummary & {
  members: GroupMember[];
};
