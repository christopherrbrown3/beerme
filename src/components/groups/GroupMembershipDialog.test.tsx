import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
import { GroupMembershipDialog } from './GroupMembershipDialog';

const mutations = vi.hoisted(() => ({
  leave: { mutateAsync: vi.fn(() => Promise.resolve()), isPending: false, isError: false },
  delete: { mutateAsync: vi.fn(() => Promise.resolve()), isPending: false, isError: false },
}));

vi.mock('../../hooks/useGroupLedger', () => ({
  useLeaveGroup: () => mutations.leave,
  useDeleteGroup: () => mutations.delete,
}));

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
  ownerId: 'user-1',
  inviteToken: 'invite',
  createdAt: '',
  memberCount: 2,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [],
};

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderDialog(selectedGroup: GroupDetails) {
  render(
    <MemoryRouter initialEntries={['/groups/group-1']}>
      <GroupMembershipDialog group={selectedGroup} onClose={vi.fn()} />
      <Location />
    </MemoryRouter>,
  );
}

describe('GroupMembershipDialog', () => {
  beforeEach(() => {
    mutations.leave.mutateAsync.mockClear();
    mutations.delete.mutateAsync.mockClear();
  });

  it('requires the exact group name before an owner can delete', async () => {
    const user = userEvent.setup();
    renderDialog(group);

    const confirmation = screen.getByRole('textbox', {
      name: /Enter “Friday Crew” to confirm/,
    });
    await user.type(confirmation, 'Friday');
    await user.click(screen.getByRole('button', { name: 'Delete group' }));
    expect(screen.getByText('Enter “Friday Crew” exactly to continue.')).toBeVisible();
    expect(mutations.delete.mutateAsync).not.toHaveBeenCalled();

    await user.clear(confirmation);
    await user.type(confirmation, 'Friday Crew');
    await user.click(screen.getByRole('button', { name: 'Delete group' }));
    expect(mutations.delete.mutateAsync).toHaveBeenCalledOnce();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('lets a non-owner leave without a destructive text challenge', async () => {
    const user = userEvent.setup();
    renderDialog({ ...group, role: 'member' });

    await user.click(screen.getByRole('button', { name: 'Leave group' }));
    expect(mutations.leave.mutateAsync).toHaveBeenCalledOnce();
    expect(mutations.delete.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
