import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { type GroupDetails } from '../../types/groups';
import { type LedgerEntry } from '../../types/transactions';
import { calculateUserBalance } from '../../utils/balances';
import { formatUnitQuantity } from '../../utils/unitPresentation';

type GroupSummaryProps = {
  group: GroupDetails;
  transactions: LedgerEntry[];
  currentUserId: string;
  isLoading: boolean;
};

export function GroupSummary({ group, transactions, currentUserId, isLoading }: GroupSummaryProps) {
  const balance = calculateUserBalance(transactions, currentUserId);

  return (
    <section className="balance-summary" aria-label="Your group balance">
      <article className="balance-summary__card balance-summary__card--owed">
        <span className="balance-summary__icon" aria-hidden="true">
          <ArrowDownLeft size={20} />
        </span>
        <div>
          <p>You are owed</p>
          <strong>{isLoading ? '—' : formatUnitQuantity(balance.owed, group.currency)}</strong>
        </div>
      </article>
      <article className="balance-summary__card balance-summary__card--owes">
        <span className="balance-summary__icon" aria-hidden="true">
          <ArrowUpRight size={20} />
        </span>
        <div>
          <p>You owe</p>
          <strong>{isLoading ? '—' : formatUnitQuantity(balance.owes, group.currency)}</strong>
        </div>
      </article>
    </section>
  );
}
