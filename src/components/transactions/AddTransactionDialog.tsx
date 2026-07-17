import { ArrowRight, Minus, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useAddTransaction } from '../../hooks/useGroupLedger';
import { type GroupDetails } from '../../types/groups';
import {
  validateTransactionNote,
  validateTransactionParties,
  validateTransactionQuantity,
} from '../../utils/transactionValidation';
import { Dialog } from '../ui/Dialog';

type AddTransactionDialogProps = {
  group: GroupDetails;
  onClose: () => void;
};

export function AddTransactionDialog({ group, onClose }: AddTransactionDialogProps) {
  const addTransaction = useAddTransaction(group);
  const [debtorUserId, setDebtorUserId] = useState('');
  const [creditorUserId, setCreditorUserId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [partiesError, setPartiesError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  function changeQuantity(nextQuantity: number) {
    const boundedQuantity = Math.min(99, Math.max(1, nextQuantity));
    setQuantity(boundedQuantity);
    setQuantityError(validateTransactionQuantity(boundedQuantity));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPartiesError = validateTransactionParties(debtorUserId, creditorUserId);
    const nextQuantityError = validateTransactionQuantity(quantity);
    const nextNoteError = validateTransactionNote(note);
    setPartiesError(nextPartiesError);
    setQuantityError(nextQuantityError);
    setNoteError(nextNoteError);

    if (nextPartiesError || nextQuantityError || nextNoteError) return;

    try {
      await addTransaction.mutateAsync({
        groupId: group.id,
        debtorUserId,
        creditorUserId,
        quantity,
        note,
      });
      onClose();
    } catch {
      // The mutation error stays in the dialog and the optimistic entry is rolled back.
    }
  }

  return (
    <Dialog
      title="Add to the ledger"
      description={`Record who owes whom. This creates a permanent ${group.currency.name.toLowerCase()} transaction.`}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="transaction-parties">
          <label className="form-field" htmlFor="transaction-debtor">
            <span className="form-field__label">Who owes?</span>
            <select
              id="transaction-debtor"
              value={debtorUserId}
              onChange={(event) => {
                setDebtorUserId(event.target.value);
                if (partiesError)
                  setPartiesError(validateTransactionParties(event.target.value, creditorUserId));
              }}
              aria-invalid={Boolean(partiesError)}
              required
            >
              <option value="">Choose a person</option>
              {group.members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field" htmlFor="transaction-creditor">
            <span className="form-field__label">Who is owed?</span>
            <select
              id="transaction-creditor"
              value={creditorUserId}
              onChange={(event) => {
                setCreditorUserId(event.target.value);
                if (partiesError)
                  setPartiesError(validateTransactionParties(debtorUserId, event.target.value));
              }}
              aria-invalid={Boolean(partiesError)}
              required
            >
              <option value="">Choose a person</option>
              {group.members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
        {partiesError && <p className="form-error">{partiesError}</p>}

        <fieldset className="quantity-field">
          <legend>How many {group.currency.plural.toLowerCase()}?</legend>
          <div className="quantity-stepper">
            <button
              type="button"
              onClick={() => changeQuantity(quantity - 1)}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <label htmlFor="transaction-quantity">
              <span className="sr-only">Quantity</span>
              <input
                id="transaction-quantity"
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                step="1"
                value={quantity}
                onChange={(event) => {
                  const nextQuantity = Number(event.target.value);
                  setQuantity(nextQuantity);
                  setQuantityError(validateTransactionQuantity(nextQuantity));
                }}
                aria-invalid={Boolean(quantityError)}
              />
            </label>
            <button
              type="button"
              onClick={() => changeQuantity(quantity + 1)}
              disabled={quantity >= 99}
              aria-label="Increase quantity"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
          {quantityError && <p className="form-error">{quantityError}</p>}
        </fieldset>

        <label className="form-field" htmlFor="transaction-note">
          <span className="form-field__label">
            Note <span className="optional-label">Optional</span>
          </span>
          <textarea
            id="transaction-note"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (noteError) setNoteError(validateTransactionNote(event.target.value));
            }}
            aria-invalid={Boolean(noteError)}
            maxLength={280}
            rows={3}
            placeholder="A round at trivia night"
          />
          <span
            className={
              noteError ? 'form-field__message form-field__message--error' : 'form-field__message'
            }
          >
            {noteError ?? `${note.length}/280`}
          </span>
        </label>

        {addTransaction.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t add that transaction. Check your connection and try again.
          </div>
        )}
        <button
          className="primary-button dialog-form__submit"
          type="submit"
          disabled={addTransaction.isPending || group.members.length < 2}
        >
          {addTransaction.isPending ? 'Adding transaction…' : 'Add transaction'}
          {!addTransaction.isPending && <ArrowRight size={18} aria-hidden="true" />}
        </button>
        {group.members.length < 2 && (
          <p className="dialog-form__hint">
            Invite at least one friend before adding a transaction.
          </p>
        )}
      </form>
    </Dialog>
  );
}
