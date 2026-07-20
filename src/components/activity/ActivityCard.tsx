import { Group, RotateCcw, UserRoundPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { type ActivityEvent } from '../../types/activity';
import { formatFriendlyTimestamp } from '../../utils/date';

type ActivityCardProps = {
  event: ActivityEvent;
};

export function ActivityCard({ event }: ActivityCardProps) {
  const Icon =
    event.type === 'transaction_reversed'
      ? RotateCcw
      : event.type === 'member_joined'
        ? UserRoundPlus
        : event.type === 'owner_transferred'
          ? RotateCcw
          : event.type === 'group_created'
            ? Group
            : null;

  return (
    <motion.article
      className={`activity-card activity-card--${event.type}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="activity-card__icon" aria-hidden="true">
        {Icon ? <Icon size={19} /> : event.groupSymbol}
      </span>
      <div className="activity-card__body">
        <p>{event.title}</p>
        {event.detail && <span className="activity-card__detail">{event.detail}</span>}
        <div className="activity-card__meta">
          <Link to={`/groups/${event.groupId}`}>{event.groupName}</Link>
          <span>·</span>
          <time dateTime={event.occurredAt}>{formatFriendlyTimestamp(event.occurredAt)}</time>
        </div>
      </div>
    </motion.article>
  );
}
