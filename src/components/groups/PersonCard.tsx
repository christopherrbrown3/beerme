import { Crown, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

import { type PairBalance } from '../../types/balances';
import { type GroupDetails, type GroupMember } from '../../types/groups';
import { type TransactionParties } from '../../types/transactions';
import { formatUnitQuantity, formatUnitSymbols } from '../../utils/unitPresentation';

type PersonCardProps = {
  member: GroupMember;
  group: GroupDetails;
  currentUserId: string;
  balance: PairBalance | null;
  onAddTransaction: (parties: TransactionParties) => void;
};

export function PersonCard({
  member,
  group,
  currentUserId,
  balance,
  onAddTransaction,
}: PersonCardProps) {
  const isCurrentUser = member.userId === currentUserId;
  const relationship = getRelationshipCopy(balance, currentUserId, member, group);

  return (
    <motion.article
      className={isCurrentUser ? 'person-card person-card--you' : 'person-card'}
      aria-labelledby={`person-${member.userId}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="person-card__identity">
        <span className="person-card__avatar" aria-hidden="true">
          {member.displayName.slice(0, 1).toUpperCase() || <UserRound size={18} />}
        </span>
        <div>
          <h3 id={`person-${member.userId}`}>
            {member.displayName} {isCurrentUser && <span>(You)</span>}
          </h3>
          <p>@{member.username}</p>
        </div>
        {member.role === 'owner' && (
          <span className="role-pill">
            <Crown size={12} aria-hidden="true" /> Owner
          </span>
        )}
      </div>

      {!isCurrentUser && (
        <>
          <div className={`person-card__balance person-card__balance--${relationship.tone}`}>
            <p>{relationship.label}</p>
            <strong aria-label={relationship.quantityLabel || undefined}>
              {relationship.symbols}
            </strong>
            {relationship.quantityLabel && <span>{relationship.quantityLabel}</span>}
          </div>
          <div className="person-card__actions">
            <button
              className="secondary-button"
              type="button"
              aria-label={`${member.displayName} owes me`}
              onClick={() =>
                onAddTransaction({ debtorUserId: member.userId, creditorUserId: currentUserId })
              }
            >
              They owe me
            </button>
            <button
              className="secondary-button"
              type="button"
              aria-label={`I owe ${member.displayName}`}
              onClick={() =>
                onAddTransaction({ debtorUserId: currentUserId, creditorUserId: member.userId })
              }
            >
              I owe them
            </button>
          </div>
        </>
      )}
    </motion.article>
  );
}

function getRelationshipCopy(
  balance: PairBalance | null,
  currentUserId: string,
  member: GroupMember,
  group: GroupDetails,
) {
  if (!balance || balance.isSettled) {
    return { label: 'All square', symbols: '—', quantityLabel: '', tone: 'even' };
  }

  const memberOwes = balance.debtorUserId === member.userId;
  return {
    label: memberOwes ? `${member.displayName} owes you` : `You owe ${member.displayName}`,
    symbols: formatUnitSymbols(balance.amount, group.currency),
    quantityLabel: formatUnitQuantity(balance.amount, group.currency),
    tone: memberOwes ? 'owed' : currentUserId === balance.debtorUserId ? 'owes' : 'even',
  };
}
