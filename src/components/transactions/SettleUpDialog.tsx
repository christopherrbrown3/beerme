import { Beer, Check, Minus, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useSettleUp } from '../../hooks/useGroupLedger';
import { type PairBalance } from '../../types/balances';
import { type GroupDetails, type GroupMember } from '../../types/groups';
import { formatUnitQuantity } from '../../utils/unitPresentation';
import { Dialog } from '../ui/Dialog';

export type SettlementResult = {
  friendName: string;
  quantity: number;
  isFullySettled: boolean;
};

type SettleUpDialogProps = {
  group: GroupDetails;
  member: GroupMember;
  balance: PairBalance;
  onClose: () => void;
  onSettled: (result: SettlementResult) => void;
};

export function SettleUpDialog({
  group,
  member,
  balance,
  onClose,
  onSettled,
}: SettleUpDialogProps) {
  const settleUp = useSettleUp(group.id);
  const maxSettlementQuantity = Math.min(balance.amount, 99);
  const [quantity, setQuantity] = useState(maxSettlementQuantity);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const remaining = Math.max(0, balance.amount - quantity);
  const isFullySettled = remaining === 0;

  function validateQuantity(nextQuantity: number) {
    if (
      !Number.isInteger(nextQuantity) ||
      nextQuantity < 1 ||
      nextQuantity > maxSettlementQuantity
    ) {
      return `Choose a whole number from 1 to ${maxSettlementQuantity}.`;
    }
    return null;
  }

  function changeQuantity(nextQuantity: number) {
    const boundedQuantity = Math.min(maxSettlementQuantity, Math.max(1, nextQuantity));
    setQuantity(boundedQuantity);
    setQuantityError(validateQuantity(boundedQuantity));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuantityError = validateQuantity(quantity);
    setQuantityError(nextQuantityError);
    if (nextQuantityError) return;

    try {
      await settleUp.mutateAsync({
        groupId: group.id,
        creditorUserId: member.userId,
        quantity,
      });
      onSettled({ friendName: member.displayName, quantity, isFullySettled });
    } catch {
      // The mutation error remains visible so the user can retry without losing their choice.
    }
  }

  return (
    <Dialog
      title={`Settle up with ${member.displayName}`}
      description={`Record the ${group.currency.plural.toLowerCase()} you actually returned. The settlement stays in your shared history.`}
      onClose={onClose}
    >
      <form className="dialog-form settle-up-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="settle-up-summary">
          <span className="settle-up-summary__icon" aria-hidden="true">
            <Beer size={22} />
          </span>
          <div>
            <p>You currently owe</p>
            <strong>{member.displayName}</strong>
          </div>
          <b>{formatUnitQuantity(balance.amount, group.currency)}</b>
        </div>

        <fieldset className="quantity-field">
          <legend>How many are you returning?</legend>
          <div className="quantity-stepper">
            <button
              type="button"
              onClick={() => changeQuantity(quantity - 1)}
              disabled={quantity <= 1}
              aria-label="Decrease settlement quantity"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <label htmlFor="settlement-quantity">
              <span className="sr-only">Settlement quantity</span>
              <input
                id="settlement-quantity"
                type="number"
                inputMode="numeric"
                min="1"
                max={maxSettlementQuantity}
                step="1"
                value={quantity}
                onChange={(event) => {
                  const nextQuantity = Number(event.target.value);
                  setQuantity(nextQuantity);
                  setQuantityError(validateQuantity(nextQuantity));
                }}
                aria-invalid={Boolean(quantityError)}
                aria-describedby={
                  quantityError ? 'settlement-quantity-error' : 'settlement-outcome'
                }
              />
            </label>
            <button
              type="button"
              onClick={() => changeQuantity(quantity + 1)}
              disabled={quantity >= maxSettlementQuantity}
              aria-label="Increase settlement quantity"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
          {quantityError && (
            <p id="settlement-quantity-error" className="form-error" role="alert">
              {quantityError}
            </p>
          )}
        </fieldset>

        <div
          id="settlement-outcome"
          className={
            isFullySettled ? 'settle-up-outcome settle-up-outcome--square' : 'settle-up-outcome'
          }
        >
          {isFullySettled ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <Beer size={17} aria-hidden="true" />
          )}
          <span>
            {isFullySettled
              ? `You and ${member.displayName} will be all square.`
              : `You’ll still owe ${formatUnitQuantity(remaining, group.currency)}.`}
          </span>
        </div>

        {settleUp.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t settle that amount. The balance may have changed—close this and try again.
          </div>
        )}

        <button
          className="primary-button dialog-form__submit settle-up-submit"
          type="submit"
          disabled={settleUp.isPending}
        >
          <Beer size={18} aria-hidden="true" />
          {settleUp.isPending
            ? 'Settling up…'
            : isFullySettled
              ? 'Settle all'
              : `Settle ${quantity}`}
        </button>
      </form>
    </Dialog>
  );
}
