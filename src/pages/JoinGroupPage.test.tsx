import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JoinGroupPage } from './JoinGroupPage';

const join = {
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isError: false,
  isPending: false,
};

vi.mock('../hooks/useGroups', () => ({
  useJoinGroup: () => ({
    mutateAsync: join.mutateAsync,
    reset: join.reset,
    isError: join.isError,
    isPending: join.isPending,
  }),
}));

describe('JoinGroupPage', () => {
  beforeEach(() => {
    join.mutateAsync.mockReset();
    join.reset.mockReset();
    join.isError = false;
    join.isPending = false;
  });

  it('does not join automatically and shows a Join group button', async () => {
    const user = userEvent.setup();
    const token = '123e4567-e89b-42d3-a456-426614174000';
    render(
      <MemoryRouter initialEntries={[`/join/${token}`]}>
        <Routes>
          <Route path="join/:token" element={<JoinGroupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Confirm your invite.' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Join group' })).toBeVisible();
    expect(join.mutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Join group' }));
    expect(join.mutateAsync).toHaveBeenCalledOnce();
  });

  it('shows an invalid invite message for malformed tokens', () => {
    render(
      <MemoryRouter initialEntries={['/join/invalid-token']}>
        <Routes>
          <Route path="join/:token" element={<JoinGroupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'This invite won’t pour.' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Join group' })).toBeNull();
  });

  it('offers a retry when a valid invite fails temporarily', async () => {
    join.isError = true;
    join.mutateAsync.mockRejectedValue(new Error('temporary network error'));

    const user = userEvent.setup();
    const token = '123e4567-e89b-42d3-a456-426614174000';
    render(
      <MemoryRouter initialEntries={[`/join/${token}`]}>
        <Routes>
          <Route path="join/:token" element={<JoinGroupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'We couldn’t join this round.' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Join group' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Join group' }));
    expect(join.mutateAsync).toHaveBeenCalledOnce();
  });
});
