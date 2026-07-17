import { ArrowRight, Link2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useJoinGroup } from '../../hooks/useGroups';
import { extractInviteToken, isUuid } from '../../utils/groupValidation';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';

type JoinGroupDialogProps = {
  onClose: () => void;
};

export function JoinGroupDialog({ onClose }: JoinGroupDialogProps) {
  const joinGroup = useJoinGroup();
  const [invite, setInvite] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = extractInviteToken(invite);

    if (!isUuid(token)) {
      setInviteError('Paste a valid BeerMe invite link or token.');
      return;
    }

    setInviteError(null);
    try {
      await joinGroup.mutateAsync(token);
      onClose();
    } catch {
      // The server error is rendered below without exposing database details.
    }
  }

  return (
    <Dialog
      title="Join a group"
      description="Paste the invite link a friend sent you. You’ll only see the group after joining."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <FormField
          label="Invite link"
          name="invite-link"
          type="text"
          value={invite}
          onChange={(event) => {
            setInvite(event.target.value);
            if (inviteError) setInviteError(null);
          }}
          error={inviteError}
          placeholder="https://beerme…/join/…"
          required
        />
        {joinGroup.isError && (
          <div className="form-alert form-alert--error" role="alert">
            That invite isn’t valid, or the group is no longer available.
          </div>
        )}
        <button
          className="primary-button dialog-form__submit"
          type="submit"
          disabled={joinGroup.isPending}
        >
          <Link2 size={18} aria-hidden="true" />
          {joinGroup.isPending ? 'Joining…' : 'Join group'}
          {!joinGroup.isPending && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>
    </Dialog>
  );
}
