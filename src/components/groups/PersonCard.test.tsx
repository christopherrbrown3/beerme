import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type PairBalance } from '../../types/balances';
import { type GroupDetails } from '../../types/groups';
import { PersonCard } from './PersonCard';

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
  ownerId: 'chris',
  inviteToken: 'invite-1',
  createdAt: '2026-07-17T00:00:00.000Z',
  memberCount: 2,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [
    { userId: 'chris', username: 'chris', displayName: 'Chris', role: 'owner', joinedAt: '' },
    { userId: 'alex', username: 'alex', displayName: 'Alex', role: 'member', joinedAt: '' },
  ],
};

const currentUserOwes: PairBalance = {
  userAId: 'chris',
  userBId: 'alex',
  amount: 2,
  debtorUserId: 'chris',
  creditorUserId: 'alex',
  isSettled: false,
};

describe('PersonCard settle-up action', () => {
  it('offers settle up only when the current user owes this person', async () => {
    const user = userEvent.setup();
    const onSettleUp = vi.fn();

    const { rerender } = render(
      <PersonCard
        member={group.members[1]!}
        group={group}
        currentUserId="chris"
        balance={currentUserOwes}
        onAddTransaction={vi.fn()}
        onSettleUp={onSettleUp}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Settle up with Alex' }));
    expect(onSettleUp).toHaveBeenCalledWith(currentUserOwes);

    rerender(
      <PersonCard
        member={group.members[1]!}
        group={group}
        currentUserId="chris"
        balance={{ ...currentUserOwes, debtorUserId: 'alex', creditorUserId: 'chris' }}
        onAddTransaction={vi.fn()}
        onSettleUp={onSettleUp}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Settle up with Alex' })).not.toBeInTheDocument();
  });
});
