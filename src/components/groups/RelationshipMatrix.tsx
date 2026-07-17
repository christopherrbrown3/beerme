import { motion } from 'framer-motion';

import { type GroupDetails, type GroupMember } from '../../types/groups';
import { type LedgerEntry, type TransactionParties } from '../../types/transactions';
import { calculateDirectionalBalance } from '../../utils/balances';
import { getMatrixHeatTone } from '../../utils/matrix';
import { formatUnitQuantity, formatUnitSymbols } from '../../utils/unitPresentation';

type RelationshipMatrixProps = {
  group: GroupDetails;
  transactions: LedgerEntry[];
  currentUserId: string;
  onAddTransaction: (parties: TransactionParties) => void;
};

export function RelationshipMatrix({
  group,
  transactions,
  currentUserId,
  onAddTransaction,
}: RelationshipMatrixProps) {
  return (
    <section className="matrix-section" aria-labelledby="matrix-heading">
      <div className="section-heading matrix-heading">
        <div>
          <p className="eyebrow">Row owes column</p>
          <h2 id="matrix-heading">Relationship matrix</h2>
        </div>
        <span className="count-pill" aria-label={`${group.memberCount} by ${group.memberCount}`}>
          {group.memberCount}×{group.memberCount}
        </span>
      </div>
      <p className="matrix-instructions" id="matrix-instructions">
        Tap a square to add a transaction in that direction. Swipe sideways to see everyone.
      </p>

      <div className="matrix-scroll" role="region" aria-label="Scrollable relationship matrix">
        <table className="relationship-matrix" aria-describedby="matrix-instructions">
          <thead>
            <tr>
              <th className="relationship-matrix__corner" scope="col">
                <span className="sr-only">Member</span>
              </th>
              {group.members.map((member) => (
                <th key={member.userId} scope="col" title={getMemberName(member, currentUserId)}>
                  <span className="matrix-avatar" aria-hidden="true">
                    {getInitials(member.displayName)}
                  </span>
                  <span>{getMemberName(member, currentUserId)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.members.map((rowMember) => (
              <tr key={rowMember.userId}>
                <th scope="row" title={getMemberName(rowMember, currentUserId)}>
                  <span className="matrix-avatar" aria-hidden="true">
                    {getInitials(rowMember.displayName)}
                  </span>
                  <span>{getMemberName(rowMember, currentUserId)}</span>
                </th>
                {group.members.map((columnMember) => {
                  const isDiagonal = rowMember.userId === columnMember.userId;
                  if (isDiagonal) {
                    return (
                      <td className="matrix-cell matrix-cell--diagonal" key={columnMember.userId}>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Same member</span>
                      </td>
                    );
                  }

                  const quantity = calculateDirectionalBalance(
                    transactions,
                    rowMember.userId,
                    columnMember.userId,
                  );
                  const rowName = getMemberName(rowMember, currentUserId);
                  const columnName = getMemberName(columnMember, currentUserId);
                  const direction = `${rowName} ${rowName === 'You' ? 'owe' : 'owes'} ${columnName}`;
                  const label =
                    quantity > 0
                      ? `${direction} ${formatUnitQuantity(quantity, group.currency)}`
                      : `${direction} nothing; all square`;

                  return (
                    <td className="matrix-cell" key={columnMember.userId}>
                      <button
                        className={`matrix-cell__button matrix-cell__button--${getMatrixHeatTone(quantity)}`}
                        type="button"
                        aria-label={label}
                        title={`${label}. Add a transaction.`}
                        onClick={() =>
                          onAddTransaction({
                            debtorUserId: rowMember.userId,
                            creditorUserId: columnMember.userId,
                          })
                        }
                      >
                        <motion.span
                          key={quantity}
                          initial={{ opacity: 0, scale: 0.75 }}
                          animate={{ opacity: 1, scale: 1 }}
                          aria-hidden="true"
                        >
                          {formatUnitSymbols(quantity, group.currency, 3)}
                        </motion.span>
                        <small aria-hidden="true">
                          {quantity > 0 ? formatUnitQuantity(quantity, group.currency) : 'Even'}
                        </small>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="matrix-legend" aria-label="Balance heat scale">
        <span>
          <i className="matrix-legend__even" /> Even
        </span>
        <span>
          <i className="matrix-legend__low" /> 1–2
        </span>
        <span>
          <i className="matrix-legend__medium" /> 3–5
        </span>
        <span>
          <i className="matrix-legend__high" /> 6+
        </span>
      </div>
    </section>
  );
}

function getInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

function getMemberName(member: GroupMember, currentUserId: string) {
  return member.userId === currentUserId ? 'You' : member.displayName;
}
