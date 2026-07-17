import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
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

describe('GroupCurrencyDialog', () => {
  beforeEach(() => updateCurrency.mutateAsync.mockClear());

  it('saves normalized custom currency labels', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GroupCurrencyDialog group={group} onClose={onClose} />);

    await user.clear(screen.getByLabelText('Singular'));
    await user.type(screen.getByLabelText('Singular'), 'Coffee');
    await user.clear(screen.getByLabelText('Plural'));
    await user.type(screen.getByLabelText('Plural'), 'Coffees');
    await user.clear(screen.getByRole('textbox', { name: /Symbol/ }));
    await user.type(screen.getByRole('textbox', { name: /Symbol/ }), '☕');
    await user.click(screen.getByRole('button', { name: 'Save currency' }));

    expect(updateCurrency.mutateAsync).toHaveBeenCalledWith({
      name: 'Coffee',
      plural: 'Coffees',
      symbol: '☕',
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps invalid currency values out of the mutation', async () => {
    const user = userEvent.setup();
    render(<GroupCurrencyDialog group={group} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Singular'));
    await user.click(screen.getByRole('button', { name: 'Save currency' }));

    expect(screen.getByText('Singular name must be between 1 and 30 characters.')).toBeVisible();
    expect(updateCurrency.mutateAsync).not.toHaveBeenCalled();
  });
});
