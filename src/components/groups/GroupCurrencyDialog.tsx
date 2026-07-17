import { Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useUpdateGroupCurrency } from '../../hooks/useGroupLedger';
import { type GroupDetails } from '../../types/groups';
import { validateCurrencyName, validateCurrencySymbol } from '../../utils/groupValidation';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';

type GroupCurrencyDialogProps = {
  group: GroupDetails;
  onClose: () => void;
};

export function GroupCurrencyDialog({ group, onClose }: GroupCurrencyDialogProps) {
  const updateCurrency = useUpdateGroupCurrency(group.id);
  const [name, setName] = useState(group.currency.name);
  const [plural, setPlural] = useState(group.currency.plural);
  const [symbol, setSymbol] = useState(group.currency.symbol);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      name: validateCurrencyName(name, 'Singular name'),
      plural: validateCurrencyName(plural, 'Plural name'),
      symbol: validateCurrencySymbol(symbol),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      await updateCurrency.mutateAsync({ name, plural, symbol });
      onClose();
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <Dialog
      title="Ledger currency"
      description="Choose what your group trades. Existing quantities stay exactly the same."
      onClose={onClose}
    >
      <form className="dialog-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <div className="currency-form-grid">
          <FormField
            label="Singular"
            name="currency-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            maxLength={30}
            required
          />
          <FormField
            label="Plural"
            name="currency-plural"
            type="text"
            value={plural}
            onChange={(event) => setPlural(event.target.value)}
            error={errors.plural}
            maxLength={30}
            required
          />
        </div>
        <FormField
          label="Symbol"
          name="currency-symbol"
          type="text"
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          error={errors.symbol}
          hint="Emoji and short labels both work."
          maxLength={12}
          required
        />
        {updateCurrency.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t save that currency. Check your connection and try again.
          </div>
        )}
        <button
          className="primary-button dialog-form__submit"
          type="submit"
          disabled={updateCurrency.isPending}
        >
          <Save size={17} aria-hidden="true" />{' '}
          {updateCurrency.isPending ? 'Saving…' : 'Save currency'}
        </button>
      </form>
    </Dialog>
  );
}
