import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilePage } from './ProfilePage';

const actions = vi.hoisted(() => ({
  updateDisplayName: vi.fn(),
  signOut: vi.fn(),
  updateIsError: false,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'friend@example.com' },
    signOut: actions.signOut,
  }),
}));

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    data: {
      id: 'user-1',
      username: 'friend',
      display_name: 'Friendly Tester',
      created_at: '2026-07-17T00:00:00.000Z',
    },
    isLoading: false,
    isError: false,
  }),
  useUpdateDisplayName: () => ({
    mutateAsync: actions.updateDisplayName,
    isPending: false,
    isSuccess: false,
    isError: actions.updateIsError,
  }),
}));

describe('ProfilePage failure handling', () => {
  beforeEach(() => {
    actions.updateDisplayName.mockReset();
    actions.signOut.mockReset();
    actions.updateIsError = false;
  });

  it('contains a rejected display-name update while rendering mutation feedback', async () => {
    const user = userEvent.setup();
    actions.updateIsError = true;
    actions.updateDisplayName.mockRejectedValue(new Error('offline'));
    render(<ProfilePage />);

    await user.clear(screen.getByLabelText('Display name'));
    await user.type(screen.getByLabelText('Display name'), 'New Name');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(actions.updateDisplayName).toHaveBeenCalledWith('New Name');
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t save that change.');
  });

  it('announces a sign-out failure and restores the action', async () => {
    const user = userEvent.setup();
    actions.signOut.mockRejectedValue(new Error('offline'));
    render(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t sign you out.');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });
});
