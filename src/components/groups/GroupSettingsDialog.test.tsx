import { render, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoBlockingAccessibilityViolations } from '../../test/accessibility';
import { type GroupDetails } from '../../types/groups';
import { GroupSettingsDialog } from './GroupSettingsDialog';

const updateDetails = vi.hoisted(() => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
  isError: false,
}));

vi.mock('../../hooks/useGroupLedger', () => ({
  useUpdateGroupDetails: () => updateDetails,
}));

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: 'The regulars.',
  ownerId: 'user-1',
  inviteToken: 'invite',
  canMembersInvite: true,
  createdAt: '',
  memberCount: 2,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [],
};

function renderDialog(overrides: Partial<ComponentProps<typeof GroupSettingsDialog>> = {}) {
  const props = {
    group,
    onClose: vi.fn(),
    onOpenCurrency: vi.fn(),
    onOpenInvite: vi.fn(),
    onOpenTransfer: vi.fn(),
    onOpenLifecycle: vi.fn(),
    ...overrides,
  };
  render(<GroupSettingsDialog {...props} />);
  return props;
}

describe('GroupSettingsDialog', () => {
  beforeEach(() => updateDetails.mutateAsync.mockClear());

  it('has no blocking accessibility violations', async () => {
    renderDialog();
    await expectNoBlockingAccessibilityViolations();
  });

  it('saves validated group identity details', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.clear(screen.getByLabelText('Group name'));
    await user.type(screen.getByLabelText('Group name'), 'Saturday Crew');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'A new round.');
    await user.selectOptions(screen.getByLabelText('Who can invite'), 'owner');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(updateDetails.mutateAsync).toHaveBeenCalledWith({
      name: 'Saturday Crew',
      description: 'A new round.',
      canMembersInvite: false,
    });
  });

  it('explains the selected invite permission', async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(
      screen.getByText('Everyone in this group can share the current invite link.'),
    ).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Who can invite'), 'owner');

    expect(
      screen.getByText(
        'Switching to this replaces the current link so only you can share the new one.',
      ),
    ).toBeVisible();
  });

  it('routes owner controls through this settings surface', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    await user.click(screen.getByRole('button', { name: /Invite links/ }));

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onOpenInvite).toHaveBeenCalledOnce();
  });
});
