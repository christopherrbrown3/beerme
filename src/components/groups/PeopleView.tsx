import { UsersRound } from 'lucide-react';

import { type BalanceEntry, type PairBalance } from '../../types/balances';
import { type GroupDetails, type GroupMember } from '../../types/groups';
import { type TransactionParties } from '../../types/transactions';
import { calculatePairBalance } from '../../utils/balances';
import { EmptyState } from '../ui/EmptyState';
import { PersonCard } from './PersonCard';

type PeopleViewProps = {
  group: GroupDetails;
  entries: BalanceEntry[];
  currentUserId: string;
  onAddTransaction: (parties: TransactionParties) => void;
  onSettleUp: (member: GroupMember, balance: PairBalance) => void;
  onRemoveMember?: (member: GroupMember) => void;
};

export function PeopleView({
  group,
  entries,
  currentUserId,
  onAddTransaction,
  onSettleUp,
  onRemoveMember,
}: PeopleViewProps) {
  if (group.members.length === 0) {
    return (
      <EmptyState icon={UsersRound} eyebrow="No members" title="Nobody is here yet">
        <p>Invite a friend to start a shared ledger.</p>
      </EmptyState>
    );
  }

  return (
    <section aria-labelledby="people-heading">
      <div className="section-heading people-heading">
        <div>
          <p className="eyebrow">Your crew</p>
          <h2 id="people-heading">People</h2>
        </div>
        <span className="count-pill" aria-label={`${group.memberCount} members`}>
          {group.memberCount}
        </span>
      </div>
      <div className="people-grid">
        {group.members.map((member) => (
          <PersonCard
            key={member.userId}
            member={member}
            group={group}
            currentUserId={currentUserId}
            balance={
              member.userId === currentUserId
                ? null
                : calculatePairBalance(entries, currentUserId, member.userId)
            }
            onAddTransaction={onAddTransaction}
            onSettleUp={(balance) => onSettleUp(member, balance)}
            onRemove={
              group.role === 'owner' && member.userId !== currentUserId && onRemoveMember
                ? () => onRemoveMember?.(member)
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
