import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
import { RemoveMemberDialog } from './RemoveMemberDialog';

const removeMember = vi.hoisted(() => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
  isError: false,
  error: null as unknown,
}));

vi.mock('../../hooks/useGroupLedger', () => ({
  useRemoveGroupMember: () => removeMember,
}));

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
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

describe('RemoveMemberDialog', () => {
  beforeEach(() => {
    removeMember.mutateAsync.mockClear();
    removeMember.isPending = false;
    removeMember.isError = false;
    removeMember.error = null;
  });

  it('confirms the target identity and removes only that member', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RemoveMemberDialog group={group} member={group.members[1]!} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Remove Alex?' })).toBeVisible();
    expect(screen.getByText(/@alex will lose access immediately/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Remove member' }));

    expect(removeMember.mutateAsync).toHaveBeenCalledWith('user-2');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows owner-state failures without blaming connectivity', () => {
    removeMember.isError = true;
    removeMember.error = new Error('Only the current group owner can remove a member.');

    render(<RemoveMemberDialog group={group} member={group.members[1]!} onClose={vi.fn()} />);

    expect(
      screen.getByText(
        'You are no longer this group’s owner. Refresh the group to see its current owner.',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
  });
});
