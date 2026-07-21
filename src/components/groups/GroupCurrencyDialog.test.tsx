import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
import { UNIT_PRESETS } from '../../utils/unitPresets';
import { GroupCurrencyDialog } from './GroupCurrencyDialog';

const updateCurrency = vi.hoisted(() => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
  isError: false,
}));

vi.mock('../../hooks/useGroupLedger', () => ({
  useUpdateGroupCurrency: () => updateCurrency,
}));

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
  ownerId: 'user-1',
  inviteToken: 'invite',
  createdAt: '',
  memberCount: 1,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [],
};

const customGroup: GroupDetails = {
  ...group,
  currency: { name: 'High five', plural: 'High fives', symbol: '🙌' },
};

describe('GroupCurrencyDialog', () => {
  beforeEach(() => updateCurrency.mutateAsync.mockClear());

  it('selects the preset matching the stored unit', () => {
    render(<GroupCurrencyDialog group={group} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Beer' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Singular')).not.toBeInTheDocument();
  });

  it.each(UNIT_PRESETS)('saves the $label preset without custom fields', async (preset) => {
    const user = userEvent.setup();
    render(<GroupCurrencyDialog group={customGroup} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: preset.label }));
    expect(screen.queryByLabelText('Singular')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save unit' }));

    expect(updateCurrency.mutateAsync).toHaveBeenCalledWith({
      name: preset.name,
      plural: preset.plural,
      symbol: preset.symbol,
    });
  });

  it('saves custom unit labels', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GroupCurrencyDialog group={customGroup} onClose={onClose} />);

    await user.clear(screen.getByLabelText('Singular'));
    await user.type(screen.getByLabelText('Singular'), 'Coffee');
    await user.clear(screen.getByLabelText('Plural'));
    await user.type(screen.getByLabelText('Plural'), 'Coffees');
    await user.clear(screen.getByRole('textbox', { name: /Symbol/ }));
    await user.type(screen.getByRole('textbox', { name: /Symbol/ }), '☕');
    await user.click(screen.getByRole('button', { name: 'Save unit' }));

    expect(updateCurrency.mutateAsync).toHaveBeenCalledWith({
      name: 'Coffee',
      plural: 'Coffees',
      symbol: '☕',
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps invalid currency values out of the mutation', async () => {
    const user = userEvent.setup();
    render(<GroupCurrencyDialog group={customGroup} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Singular'));
    await user.click(screen.getByRole('button', { name: 'Save unit' }));

    expect(screen.getByText('Singular name must be between 1 and 30 characters.')).toBeVisible();
    expect(updateCurrency.mutateAsync).not.toHaveBeenCalled();
  });

  it('preserves a custom draft while a preset is previewed', async () => {
    const user = userEvent.setup();
    render(<GroupCurrencyDialog group={customGroup} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Singular'));
    await user.type(screen.getByLabelText('Singular'), 'Helping hand');
    await user.click(screen.getByRole('button', { name: 'Coffee' }));
    await user.click(screen.getByRole('button', { name: 'Custom' }));

    expect(screen.getByLabelText('Singular')).toHaveValue('Helping hand');
  });
});
