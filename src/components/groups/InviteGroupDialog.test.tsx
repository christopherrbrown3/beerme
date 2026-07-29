import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type GroupDetails } from '../../types/groups';
import { InviteGroupDialog } from './InviteGroupDialog';

const toDataURL = vi.hoisted(() => vi.fn(() => Promise.resolve('data:image/png;base64,invite')));
const rotateInvite = vi.hoisted(() => vi.fn());

vi.mock('qrcode', () => ({ default: { toDataURL } }));
vi.mock('../../hooks/useGroupLedger', () => ({
  useRotateGroupInvite: () => ({
    mutateAsync: rotateInvite,
    isError: false,
    error: null,
    isPending: false,
  }),
}));

const group: GroupDetails = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
  ownerId: 'user-1',
  inviteToken: '123e4567-e89b-42d3-a456-426614174000',
  canMembersInvite: true,
  createdAt: '',
  memberCount: 1,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  members: [],
};

describe('InviteGroupDialog', () => {
  beforeEach(() => {
    toDataURL.mockReset();
    toDataURL.mockResolvedValue('data:image/png;base64,invite');
    rotateInvite.mockReset();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('generates the QR locally and copies the protected invite route', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<InviteGroupDialog group={group} onClose={vi.fn()} />);

    expect(
      await screen.findByRole('img', { name: 'QR code for the Friday Crew invite' }),
    ).toHaveAttribute('src', 'data:image/png;base64,invite');
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:3000/?invite=123e4567-e89b-42d3-a456-426614174000',
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('uses the native share sheet when available', async () => {
    const user = userEvent.setup();
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });

    render(<InviteGroupDialog group={group} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Share invite' }));

    expect(share).toHaveBeenCalledWith({
      title: 'Join my group on BeerMe',
      text: 'Join my group on BeerMe.',
      url: 'http://localhost:3000/?invite=123e4567-e89b-42d3-a456-426614174000',
    });
    await waitFor(() => expect(screen.getByText('Share sheet opened.')).toBeInTheDocument());
  });

  it('keeps link actions available when QR generation fails', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    toDataURL.mockRejectedValueOnce(new Error('QR chunk unavailable'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<InviteGroupDialog group={group} onClose={vi.fn()} />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'QR code unavailable. Use the invite link below.',
    );
    expect(screen.queryByText(/Copy wasn’t available/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('requires confirmation before rotating and then replaces the displayed link', async () => {
    const user = userEvent.setup();
    rotateInvite.mockResolvedValue('223e4567-e89b-42d3-a456-426614174000');

    render(<InviteGroupDialog group={group} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Rotate invite' }));
    expect(
      screen.getByText('People with the current link will no longer be able to join.'),
    ).toBeVisible();
    expect(rotateInvite).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Rotate link' }));
    await waitFor(() => expect(rotateInvite).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('Invite link')).toHaveValue(
      'http://localhost:3000/?invite=223e4567-e89b-42d3-a456-426614174000',
    );
  });

  it('lets members share without exposing owner-only link rotation', () => {
    render(
      <InviteGroupDialog
        group={{ ...group, role: 'member', ownerId: 'user-2' }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Rotate invite' })).not.toBeInTheDocument();
  });
});
