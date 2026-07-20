import { CheckCircle2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useTransferGroupOwnership } from '../../hooks/useGroupLedger';
import { type GroupDetails } from '../../types/groups';
import { Dialog } from '../ui/Dialog';

type TransferOwnershipDialogProps = {
  group: GroupDetails;
  currentUserId: string;
  onClose: () => void;
};

export function TransferOwnershipDialog({ group, currentUserId, onClose }: TransferOwnershipDialogProps) {
  const transferOwnership = useTransferGroupOwnership(group.id);
  const [targetUserId, setTargetUserId] = useState('');
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const candidateMembers = group.members.filter((member) => member.userId !== currentUserId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetUserId) {
      setSelectionError('Choose the new owner before continuing.');
      return;
    }

    try {
      await transferOwnership.mutateAsync(targetUserId);
      onClose();
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <Dialog
      title="Transfer group ownership"
      description="Choose another member to become the owner. You will stay in the group as a normal member."
      onClose={onClose}
    >
      <form className="dialog-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <label className="form-field" htmlFor="transfer-owner-select">
          <span className="form-field__label">New owner</span>
          <select
            id="transfer-owner-select"
            name="new-owner"
            value={targetUserId}
            onChange={(event) => {
              setTargetUserId(event.target.value);
              if (selectionError) setSelectionError(null);
            }}
            disabled={transferOwnership.isPending}
            required
          >
            <option value="">Choose a member</option>
            {candidateMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName} @{member.username}
              </option>
            ))}
          </select>
          {selectionError && <span className="form-field__message form-field__message--error">{selectionError}</span>}
        </label>

        {transferOwnership.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t transfer ownership. Check your connection and try again.
          </div>
        )}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={transferOwnership.isPending}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={transferOwnership.isPending || candidateMembers.length === 0}>
            <CheckCircle2 size={17} aria-hidden="true" />
            {transferOwnership.isPending ? 'Transferring…' : 'Transfer ownership'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
