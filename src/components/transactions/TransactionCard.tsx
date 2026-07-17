import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

import { type GroupDetails } from '../../types/groups';
import { type LedgerEntry } from '../../types/transactions';
import { formatFriendlyTimestamp } from '../../utils/date';

type TransactionCardProps = {
  entry: LedgerEntry;
  group: GroupDetails;
  currentUserId: string;
  onReverse: (entry: LedgerEntry) => void;
};

export function TransactionCard({ entry, group, currentUserId, onReverse }: TransactionCardProps) {
  const unit = entry.quantity === 1 ? group.currency.name : group.currency.plural;
  const canReverse =
    !entry.reversedAt &&
    !entry.isOptimistic &&
    (entry.createdBy.id === currentUserId || group.ownerId === currentUserId);

  return (
    <motion.article
      className={
        entry.reversedAt ? 'transaction-card transaction-card--reversed' : 'transaction-card'
      }
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="transaction-card__symbol" aria-hidden="true">
        {group.currency.symbol}
      </div>
      <div className="transaction-card__body">
        <div className="transaction-card__topline">
          <p>
            <strong>{entry.debtor.displayName}</strong> owes{' '}
            <strong>{entry.creditor.displayName}</strong>{' '}
            <span>
              {entry.quantity} {unit}
            </span>
          </p>
          {entry.reversedAt && <span className="reversed-pill">Reversed</span>}
        </div>
        {entry.note && <p className="transaction-card__note">“{entry.note}”</p>}
        <div className="transaction-card__meta">
          <span>
            {entry.isOptimistic ? 'Saving…' : formatFriendlyTimestamp(entry.createdAt)} · added by{' '}
            {entry.createdBy.displayName}
          </span>
          {canReverse && (
            <button type="button" onClick={() => onReverse(entry)}>
              <RotateCcw size={14} aria-hidden="true" /> Reverse
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
