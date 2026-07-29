import { ChevronRight, Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useUpdateGroupDetails } from '../../hooks/useGroupLedger';
import { type GroupDetails } from '../../types/groups';
import { validateGroupDescription, validateGroupName } from '../../utils/groupValidation';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';

type GroupSettingsDialogProps = {
  group: GroupDetails;
  onClose: () => void;
  onOpenCurrency: () => void;
  onOpenInvite: () => void;
  onOpenTransfer: () => void;
  onOpenLifecycle: () => void;
};

export function GroupSettingsDialog({
  group,
  onClose,
  onOpenCurrency,
  onOpenInvite,
  onOpenTransfer,
  onOpenLifecycle,
}: GroupSettingsDialogProps) {
  const updateDetails = useUpdateGroupDetails(group.id);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [errors, setErrors] = useState<{ name?: string | null; description?: string | null }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      name: validateGroupName(name),
      description: validateGroupDescription(description),
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.description) return;

    try {
      await updateDetails.mutateAsync({ name, description });
    } catch {
      // The mutation error is rendered below.
    }
  }

  function open(next: () => void) {
    onClose();
    next();
  }

  return (
    <Dialog
      title="Group settings"
      description="Update your group and manage the controls that affect everyone."
      onClose={onClose}
    >
      <form className="dialog-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <FormField
          label="Group name"
          name="group-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          maxLength={60}
          required
        />
        <label className="form-field" htmlFor="group-description">
          <span className="form-field__label">Description</span>
          <textarea
            id="group-description"
            name="group-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'group-description-error' : undefined}
            maxLength={280}
            rows={3}
          />
          {errors.description && (
            <span
              id="group-description-error"
              className="form-field__message form-field__message--error"
            >
              {errors.description}
            </span>
          )}
        </label>
        {updateDetails.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t save those group details. Check your connection and try again.
          </div>
        )}
        <button
          className="primary-button dialog-form__submit"
          type="submit"
          disabled={updateDetails.isPending}
        >
          <Save size={17} aria-hidden="true" />{' '}
          {updateDetails.isPending ? 'Saving…' : 'Save details'}
        </button>
      </form>

      <div className="group-settings-actions" aria-label="Group management">
        <button className="settings-row" type="button" onClick={() => open(onOpenCurrency)}>
          <span>
            <strong>Ledger unit</strong>
            <small>
              {group.currency.symbol} {group.currency.plural}
            </small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button className="settings-row" type="button" onClick={() => open(onOpenInvite)}>
          <span>
            <strong>Invite links</strong>
            <small>Share, replace, or revoke the current link.</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button className="settings-row" type="button" onClick={() => open(onOpenTransfer)}>
          <span>
            <strong>Transfer ownership</strong>
            <small>Choose another member to own this group.</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button
          className="settings-row settings-row--danger"
          type="button"
          onClick={() => open(onOpenLifecycle)}
        >
          <span>
            <strong>Delete group</strong>
            <small>Permanently remove this group and its ledger.</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </Dialog>
  );
}
