import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useCreateGroup } from '../../hooks/useGroups';
import { validateGroupDescription, validateGroupName } from '../../utils/groupValidation';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';

type CreateGroupDialogProps = {
  onClose: () => void;
};

export function CreateGroupDialog({ onClose }: CreateGroupDialogProps) {
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextNameError = validateGroupName(name);
    const nextDescriptionError = validateGroupDescription(description);
    setNameError(nextNameError);
    setDescriptionError(nextDescriptionError);

    if (nextNameError || nextDescriptionError) return;

    try {
      await createGroup.mutateAsync({ name, description });
      onClose();
    } catch {
      // The mutation error is rendered below and the optimistic cache is rolled back.
    }
  }

  return (
    <Dialog
      title="Create a group"
      description="Give your crew a home. You’ll be added as the owner automatically."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <FormField
          label="Group name"
          name="group-name"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(validateGroupName(event.target.value));
          }}
          error={nameError}
          maxLength={60}
          required
        />
        <label className="form-field" htmlFor="group-description">
          <span className="form-field__label">
            Description <span className="optional-label">Optional</span>
          </span>
          <textarea
            id="group-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              if (descriptionError)
                setDescriptionError(validateGroupDescription(event.target.value));
            }}
            aria-invalid={Boolean(descriptionError)}
            aria-describedby="group-description-hint"
            maxLength={280}
            rows={3}
          />
          <span
            id="group-description-hint"
            className={
              descriptionError
                ? 'form-field__message form-field__message--error'
                : 'form-field__message'
            }
          >
            {descriptionError ?? `${description.length}/280`}
          </span>
        </label>
        {createGroup.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t create that group. Check your connection and try again.
          </div>
        )}
        <button
          className="primary-button dialog-form__submit"
          type="submit"
          disabled={createGroup.isPending}
        >
          {createGroup.isPending ? 'Creating group…' : 'Create group'}
          {!createGroup.isPending && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>
    </Dialog>
  );
}
