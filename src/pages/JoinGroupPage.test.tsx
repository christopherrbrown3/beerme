import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JoinGroupPage } from './JoinGroupPage';

const join = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('../hooks/useGroups', () => ({
  useJoinGroup: () => ({
    mutateAsync: join.mutateAsync,
    reset: join.reset,
    isError: true,
  }),
}));

describe('JoinGroupPage', () => {
  beforeEach(() => {
    join.mutateAsync.mockReset();
    join.reset.mockReset();
    join.mutateAsync.mockRejectedValue(new Error('temporary network error'));
  });

  it('offers a retry when a valid invite fails temporarily', async () => {
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
    await waitFor(() => expect(join.mutateAsync).toHaveBeenCalledOnce());

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(join.reset).toHaveBeenCalledOnce();
    expect(join.mutateAsync).toHaveBeenCalledTimes(2);
  });
});
