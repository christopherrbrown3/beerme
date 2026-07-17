import { RotateCcw } from 'lucide-react';

import { useReverseTransaction } from '../../hooks/useGroupLedger';
import { type GroupDetails } from '../../types/groups';
import { type LedgerEntry } from '../../types/transactions';
import { Dialog } from '../ui/Dialog';

type ReverseTransactionDialogProps = {
  group: GroupDetails;
  entry: LedgerEntry;
  onClose: () => void;
};

export function ReverseTransactionDialog({ group, entry, onClose }: ReverseTransactionDialogProps) {
  const reverseTransaction = useReverseTransaction(group.id);
  const unit = entry.quantity === 1 ? group.currency.name : group.currency.plural;

  async function handleReverse() {
    try {
      await reverseTransaction.mutateAsync(entry.id);
      onClose();
    } catch {
      // The mutation error is rendered below and the optimistic reversal is rolled back.
    }
  }

  return (
    <Dialog
      title="Reverse transaction?"
      description="The original entry will stay in history and be clearly marked as reversed."
      onClose={onClose}
    >
      <div className="reverse-summary">
        <span aria-hidden="true">{group.currency.symbol}</span>
        <p>
          <strong>{entry.debtor.displayName}</strong> owes{' '}
          <strong>{entry.creditor.displayName}</strong> {entry.quantity} {unit}
        </p>
      </div>
      {reverseTransaction.isError && (
        <div className="form-alert form-alert--error" role="alert">
          We couldn’t reverse that transaction. It may have already changed.
        </div>
      )}
      <div className="dialog-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Keep it
        </button>
        <button
          className="danger-button"
          type="button"
          disabled={reverseTransaction.isPending}
          onClick={() => void handleReverse()}
        >
          <RotateCcw size={16} aria-hidden="true" />
          {reverseTransaction.isPending ? 'Reversing…' : 'Reverse transaction'}
        </button>
      </div>
    </Dialog>
  );
}
