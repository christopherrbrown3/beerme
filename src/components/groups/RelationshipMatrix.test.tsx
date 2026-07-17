import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
import { type LedgerEntry } from '../../types/transactions';
import { getMatrixHeatTone } from '../../utils/matrix';
import { RelationshipMatrix } from './RelationshipMatrix';

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
  ownerId: 'chris',
  inviteToken: '123e4567-e89b-42d3-a456-426614174000',
  createdAt: '2026-07-17T00:00:00.000Z',
  memberCount: 3,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [
    { userId: 'chris', username: 'chris', displayName: 'Chris', role: 'owner', joinedAt: '' },
    { userId: 'alex', username: 'alex', displayName: 'Alex', role: 'member', joinedAt: '' },
    { userId: 'sam', username: 'sam', displayName: 'Sam', role: 'member', joinedAt: '' },
  ],
};

function ledgerEntry(debtorId: string, creditorId: string, quantity: number): LedgerEntry {
  const profile = (id: string) => ({ id, username: id, displayName: id });
  return {
    id: `${debtorId}-${creditorId}-${quantity}`,
    groupId: group.id,
    debtor: profile(debtorId),
    creditor: profile(creditorId),
    quantity,
    note: null,
    createdBy: profile('chris'),
    createdAt: '2026-07-17T00:00:00.000Z',
    reversedAt: null,
    reversedBy: null,
  };
}

describe('RelationshipMatrix', () => {
  it('renders directional net balances and leaves the diagonal inert', () => {
    render(
      <RelationshipMatrix
        group={group}
        transactions={[ledgerEntry('alex', 'chris', 3), ledgerEntry('chris', 'alex', 1)]}
        currentUserId="chris"
        onAddTransaction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Alex owes You 2 Beers' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'You owe Alex nothing; all square' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Same member')).toHaveLength(3);
  });

  it('opens a transaction in the selected row-to-column direction', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn();
    render(
      <RelationshipMatrix
        group={group}
        transactions={[]}
        currentUserId="chris"
        onAddTransaction={onAddTransaction}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Sam owes You nothing; all square' }));
    expect(onAddTransaction).toHaveBeenCalledWith({
      debtorUserId: 'sam',
      creditorUserId: 'chris',
    });
  });
});

describe('getHeatTone', () => {
  it('matches the product heat thresholds', () => {
    expect(getMatrixHeatTone(0)).toBe('even');
    expect(getMatrixHeatTone(1)).toBe('low');
    expect(getMatrixHeatTone(2)).toBe('low');
    expect(getMatrixHeatTone(3)).toBe('medium');
    expect(getMatrixHeatTone(5)).toBe('medium');
    expect(getMatrixHeatTone(6)).toBe('high');
  });
});
