import { ArrowUpRight, Crown, UsersRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { type GroupSummary } from '../../types/groups';
import { formatFriendlyTimestamp } from '../../utils/date';
import { formatUnitQuantity } from '../../utils/unitPresentation';

type GroupCardProps = {
  group: GroupSummary;
};

export function GroupCard({ group }: GroupCardProps) {
  return (
    <motion.article
      className={
        group.id.startsWith('optimistic-') ? 'group-card group-card--saving' : 'group-card'
      }
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <div className="group-card__topline">
        <span className="group-card__symbol" aria-hidden="true">
          {group.currency.symbol}
        </span>
        {group.role === 'owner' && (
          <span className="role-pill">
            <Crown size={13} aria-hidden="true" /> Owner
          </span>
        )}
      </div>
      <Link
        className="group-card__link"
        to={group.id.startsWith('optimistic-') ? '#' : `/groups/${group.id}`}
        aria-disabled={group.id.startsWith('optimistic-')}
      >
        <h3>{group.name}</h3>
        <p className="group-card__description">
          {group.description || 'The crew is assembled. The story starts here.'}
        </p>
        <div
          className={
            group.currentUserBalance > 0
              ? 'group-card__balance group-card__balance--owed'
              : group.currentUserBalance < 0
                ? 'group-card__balance group-card__balance--owes'
                : 'group-card__balance'
          }
        >
          <span>
            {group.currentUserBalance > 0
              ? 'You are owed'
              : group.currentUserBalance < 0
                ? 'You owe'
                : 'All square'}
          </span>
          {group.currentUserBalance !== 0 && (
            <strong>
              {formatUnitQuantity(Math.abs(group.currentUserBalance), group.currency)}
            </strong>
          )}
        </div>
        <div className="group-card__footer">
          <span>
            <UsersRound size={16} aria-hidden="true" />
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </span>
          <span>
            {group.id.startsWith('optimistic-')
              ? 'Saving…'
              : group.lastActivityAt
                ? formatFriendlyTimestamp(group.lastActivityAt)
                : 'No activity yet'}
            {!group.id.startsWith('optimistic-') && <ArrowUpRight size={15} aria-hidden="true" />}
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
