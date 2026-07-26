import { UserMinus } from 'lucide-react';
import { type FormEvent } from 'react';

import { useRemoveGroupMember } from '../../hooks/useGroupLedger';
import { getFriendlyRemoveMemberError } from '../../services/groupService';
import { type GroupDetails, type GroupMember } from '../../types/groups';
import { Dialog } from '../ui/Dialog';

type RemoveMemberDialogProps = {
  group: GroupDetails;
  member: GroupMember;
  onClose: () => void;
};

export function RemoveMemberDialog({ group, member, onClose }: RemoveMemberDialogProps) {
  const removeMember = useRemoveGroupMember(group.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await removeMember.mutateAsync(member.userId);
      onClose();
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <Dialog
      title={`Remove ${member.displayName}?`}
      description={`@${member.username} will lose access immediately. Their existing transactions will stay in the group history.`}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        {removeMember.isError && (
          <div className="form-alert form-alert--error" role="alert">
            {getFriendlyRemoveMemberError(removeMember.error)}
          </div>
        )}

        <div className="dialog-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={removeMember.isPending}
          >
            Keep member
          </button>
          <button className="danger-button" type="submit" disabled={removeMember.isPending}>
            <UserMinus size={17} aria-hidden="true" />
            {removeMember.isPending ? 'Removing…' : 'Remove member'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
