import { Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useUpdateGroupCurrency } from '../../hooks/useGroupLedger';
import { type GroupCurrency, type GroupDetails } from '../../types/groups';
import { validateCurrencyName, validateCurrencySymbol } from '../../utils/groupValidation';
import { findUnitPreset, UNIT_PRESETS } from '../../utils/unitPresets';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';

type GroupCurrencyDialogProps = {
  group: GroupDetails;
  onClose: () => void;
};

export function GroupCurrencyDialog({ group, onClose }: GroupCurrencyDialogProps) {
  const updateCurrency = useUpdateGroupCurrency(group.id);
  const initialPreset = findUnitPreset(group.currency);
  const [selectedPresetKey, setSelectedPresetKey] = useState(initialPreset?.key ?? 'custom');
  const [customDraft, setCustomDraft] = useState<GroupCurrency>(group.currency);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const selectedPreset = UNIT_PRESETS.find((preset) => preset.key === selectedPresetKey);
  const selectedUnit: GroupCurrency = selectedPreset
    ? {
        name: selectedPreset.name,
        plural: selectedPreset.plural,
        symbol: selectedPreset.symbol,
      }
    : customDraft;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      name: validateCurrencyName(selectedUnit.name, 'Singular name'),
      plural: validateCurrencyName(selectedUnit.plural, 'Plural name'),
      symbol: validateCurrencySymbol(selectedUnit.symbol),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      await updateCurrency.mutateAsync(selectedUnit);
      onClose();
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <Dialog
      title="Ledger unit"
      description="Choose the item or favor your group tracks. Existing quantities stay exactly the same."
      onClose={onClose}
    >
      <form className="dialog-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <fieldset className="unit-presets">
          <legend>Choose an IOU unit</legend>
          <div className="unit-presets__grid">
            {UNIT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                className="unit-preset"
                type="button"
                aria-pressed={selectedPresetKey === preset.key}
                onClick={() => {
                  setSelectedPresetKey(preset.key);
                  setErrors({});
                }}
              >
                <span aria-hidden="true">{preset.symbol}</span>
                {preset.label}
              </button>
            ))}
            <button
              className="unit-preset"
              type="button"
              aria-pressed={selectedPresetKey === 'custom'}
              onClick={() => {
                setSelectedPresetKey('custom');
                setErrors({});
              }}
            >
              <span aria-hidden="true">✏️</span>
              Custom
            </button>
          </div>
        </fieldset>

        {selectedPresetKey === 'custom' && (
          <div className="unit-custom-fields">
            <div className="currency-form-grid">
              <FormField
                label="Singular"
                name="currency-name"
                type="text"
                value={customDraft.name}
                onChange={(event) =>
                  setCustomDraft((draft) => ({ ...draft, name: event.target.value }))
                }
                error={errors.name}
                maxLength={30}
                required
              />
              <FormField
                label="Plural"
                name="currency-plural"
                type="text"
                value={customDraft.plural}
                onChange={(event) =>
                  setCustomDraft((draft) => ({ ...draft, plural: event.target.value }))
                }
                error={errors.plural}
                maxLength={30}
                required
              />
            </div>
            <FormField
              label="Symbol"
              name="currency-symbol"
              type="text"
              value={customDraft.symbol}
              onChange={(event) =>
                setCustomDraft((draft) => ({ ...draft, symbol: event.target.value }))
              }
              error={errors.symbol}
              hint="Emoji and short labels both work."
              maxLength={12}
              required
            />
          </div>
        )}
        {updateCurrency.isError && (
          <div className="form-alert form-alert--error" role="alert">
            We couldn’t save that unit. Check your connection and try again.
          </div>
        )}
        <button
          className="primary-button dialog-form__submit"
          type="submit"
          disabled={updateCurrency.isPending}
        >
          <Save size={17} aria-hidden="true" /> {updateCurrency.isPending ? 'Saving…' : 'Save unit'}
        </button>
      </form>
    </Dialog>
  );
}
