import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
import { TransferOwnershipDialog } from './TransferOwnershipDialog';

const transfer = vi.hoisted(() => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
  isError: false,
  error: null as unknown,
}));

vi.mock('../../hooks/useGroupLedger', () => ({
  useTransferGroupOwnership: () => transfer,
}));

type MockDialogProps = {
  group: GroupDetails;
};

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: 'Fun group',
  ownerId: 'user-1',
  inviteToken: 'invite',
  createdAt: '2026-07-17T10:00:00.000Z',
  memberCount: 2,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [
    {
      userId: 'user-1',
      role: 'owner',
      joinedAt: '2026-07-17T10:00:00.000Z',
      username: 'chris',
      displayName: 'Chris',
    },
    {
      userId: 'user-2',
      role: 'member',
      joinedAt: '2026-07-17T11:00:00.000Z',
      username: 'alex',
      displayName: 'Alex',
    },
  ],
};

function renderDialog(props: MockDialogProps) {
  render(<TransferOwnershipDialog group={props.group} currentUserId="user-1" onClose={vi.fn()} />);
}

describe('TransferOwnershipDialog', () => {
  beforeEach(() => {
    transfer.mutateAsync.mockClear();
    transfer.isPending = false;
    transfer.isError = false;
    transfer.error = null;
  });

  it('requires a new owner to be selected before transferring', async () => {
    const user = userEvent.setup();
    renderDialog({ group });

    await user.click(screen.getByRole('button', { name: 'Transfer ownership' }));

    expect(await screen.findByText('Choose the new owner before continuing.')).toBeVisible();
    expect(transfer.mutateAsync).not.toHaveBeenCalled();
  });

  it('calls mutateAsync when a different member is selected', async () => {
    const user = userEvent.setup();
    renderDialog({ group });

    await user.selectOptions(screen.getByLabelText('New owner'), 'user-2');
    await user.click(screen.getByRole('button', { name: 'Transfer ownership' }));

    expect(transfer.mutateAsync).toHaveBeenCalledWith('user-2');
  });

  it('disables the transfer action when there are no other members', () => {
    const ownerOnlyGroup: GroupDetails = {
      ...group,
      memberCount: 1,
      members: [group.members[0]!],
    };

    renderDialog({ group: ownerOnlyGroup });
    expect(screen.getByRole('button', { name: 'Transfer ownership' })).toBeDisabled();
  });

  it('shows an actionable owner-state error without blaming connectivity', () => {
    transfer.isError = true;
    transfer.error = new Error('Only the current group owner can transfer ownership.');

    renderDialog({ group });

    expect(
      screen.getByText(
        'You are no longer this group’s owner. Refresh the group to see its current owner.',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
  });

  it('reserves connection guidance for actual network failures', () => {
    transfer.isError = true;
    transfer.error = new TypeError('Failed to fetch');

    renderDialog({ group });

    expect(
      screen.getByText('We couldn’t reach BeerMe. Check your connection and try again.'),
    ).toBeVisible();
  });
});
