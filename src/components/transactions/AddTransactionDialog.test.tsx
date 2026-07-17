import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
import { AddTransactionDialog } from './AddTransactionDialog';

vi.mock('../../hooks/useGroupLedger', () => ({
  useAddTransaction: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
  ownerId: 'user-1',
  inviteToken: 'invite-1',
  createdAt: '2026-07-17T00:00:00.000Z',
  memberCount: 2,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [
    {
      userId: 'user-1',
      role: 'owner',
      joinedAt: '',
      username: 'chris',
      displayName: 'Chris',
    },
    {
      userId: 'user-2',
      role: 'member',
      joinedAt: '',
      username: 'alex',
      displayName: 'Alex',
    },
  ],
};

describe('AddTransactionDialog accessibility', () => {
  it('associates visible validation messages with each invalid control', async () => {
    const user = userEvent.setup();
    render(<AddTransactionDialog group={group} onClose={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Who owes?'), 'user-1');
    await user.selectOptions(screen.getByLabelText('Who is owed?'), 'user-1');
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(screen.getByLabelText('Who owes?')).toHaveAccessibleDescription(
      'Choose two different people.',
    );
    expect(screen.getByLabelText('Who is owed?')).toHaveAccessibleDescription(
      'Choose two different people.',
    );

    await user.selectOptions(screen.getByLabelText('Who is owed?'), 'user-2');
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Note/), { target: { value: 'x'.repeat(281) } });
    fireEvent.submit(screen.getByRole('button', { name: 'Add transaction' }).closest('form')!);

    expect(screen.getByLabelText('Quantity')).toHaveAccessibleDescription(
      'Quantity must be a whole number between 1 and 99.',
    );
    expect(screen.getByLabelText(/^Note/)).toHaveAccessibleDescription(
      'Note must be 280 characters or fewer.',
    );
  });
});
