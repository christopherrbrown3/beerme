import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoBlockingAccessibilityViolations } from '../../test/accessibility';
import { type PairBalance } from '../../types/balances';
import { type GroupDetails } from '../../types/groups';
import { SettleUpDialog } from './SettleUpDialog';

const mutateAsync = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useGroupLedger', () => ({
  useSettleUp: () => ({
    mutateAsync,
    isPending: false,
    isError: false,
  }),
}));

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

const balance: PairBalance = {
  userAId: 'chris',
  userBId: 'alex',
  amount: 3,
  debtorUserId: 'chris',
  creditorUserId: 'alex',
  isSettled: false,
};

describe('SettleUpDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ id: 'settlement-1' });
  });

  it('defaults to settling the full relationship and reports an all-square result', async () => {
    const user = userEvent.setup();
    const onSettled = vi.fn();

    render(
      <SettleUpDialog
        group={group}
        member={group.members[1]!}
        balance={balance}
        onClose={vi.fn()}
        onSettled={onSettled}
      />,
    );

    expect(screen.getByLabelText('Settlement quantity')).toHaveValue(3);
    expect(screen.getByText('You and Alex will be all square.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Settle all' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      groupId: 'group-1',
      creditorUserId: 'alex',
      quantity: 3,
    });
    expect(onSettled).toHaveBeenCalledWith({
      friendName: 'Alex',
      quantity: 3,
      isFullySettled: true,
    });
  });

  it('previews and records a partial settlement', async () => {
    const user = userEvent.setup();
    const onSettled = vi.fn();

    render(
      <SettleUpDialog
        group={group}
        member={group.members[1]!}
        balance={balance}
        onClose={vi.fn()}
        onSettled={onSettled}
      />,
    );

    fireEvent.change(screen.getByLabelText('Settlement quantity'), { target: { value: '2' } });
    expect(screen.getByText('You’ll still owe 1 Beer.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Settle 2' }));

    expect(onSettled).toHaveBeenCalledWith({
      friendName: 'Alex',
      quantity: 2,
      isFullySettled: false,
    });
  });

  it('caps one settlement at the ledger entry limit and stays accessible', async () => {
    render(
      <SettleUpDialog
        group={group}
        member={group.members[1]!}
        balance={{ ...balance, amount: 120 }}
        onClose={vi.fn()}
        onSettled={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Settlement quantity')).toHaveValue(99);
    expect(screen.getByText('You’ll still owe 21 Beers.')).toBeVisible();
    await expectNoBlockingAccessibilityViolations();
  });
});
