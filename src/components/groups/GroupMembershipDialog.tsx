import { LogOut, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDeleteGroup, useLeaveGroup } from '../../hooks/useGroupLedger';
import { type GroupDetails } from '../../types/groups';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';

type GroupMembershipDialogProps = {
  group: GroupDetails;
  onClose: () => void;
};

export function GroupMembershipDialog({ group, onClose }: GroupMembershipDialogProps) {
  const isOwner = group.role === 'owner';
  const leaveGroup = useLeaveGroup(group.id);
  const deleteGroup = useDeleteGroup(group.id);
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const mutation = isOwner ? deleteGroup : leaveGroup;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isOwner && confirmation !== group.name) {
      setConfirmationError(`Enter “${group.name}” exactly to continue.`);
      return;
    }

    try {
      await mutation.mutateAsync();
      navigate('/', { replace: true });
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <Dialog
      title={isOwner ? 'Delete this group?' : 'Leave this group?'}
      description={
        isOwner
          ? 'This permanently deletes the group, its memberships, and its complete transaction history.'
          : 'You’ll lose access immediately. The group and its transaction history will remain for everyone else.'
      }
      onClose={onClose}
    >
      <form className="dialog-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        {isOwner && (
          <FormField
            label={`Enter “${group.name}” to confirm`}
            name="delete-group-confirmation"
            type="text"
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              if (confirmationError) setConfirmationError(null);
            }}
            error={confirmationError}
            autoComplete="off"
            required
          />
        )}
        {mutation.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t {isOwner ? 'delete' : 'leave'} that group. Try again.
          </div>
        )}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="danger-button" type="submit" disabled={mutation.isPending}>
            {isOwner ? (
              <Trash2 size={17} aria-hidden="true" />
            ) : (
              <LogOut size={17} aria-hidden="true" />
            )}
            {mutation.isPending
              ? isOwner
                ? 'Deleting…'
                : 'Leaving…'
              : isOwner
                ? 'Delete group'
                : 'Leave group'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
