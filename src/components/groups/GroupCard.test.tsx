import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { expectNoBlockingAccessibilityViolations } from '../../test/accessibility';
import { type GroupSummary } from '../../types/groups';
import { GroupCard } from './GroupCard';

const group: GroupSummary = {
  id: 'group-1',
  name: 'Friday Crew',
  description: null,
  ownerId: 'user-1',
  inviteToken: 'invite-1',
  createdAt: '2026-07-17T00:00:00.000Z',
  memberCount: 1,
  role: 'owner',
  currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
  currentUserBalance: 0,
  lastActivityAt: null,
};

describe('GroupCard', () => {
  it('renders a saved group as a normal link', () => {
    render(<GroupCard group={group} />, { wrapper: MemoryRouter });
    expect(screen.getByRole('link', { name: /Friday Crew/ })).toHaveAttribute(
      'href',
      '/groups/group-1',
    );
  });

  it('does not expose an optimistic group as an actionable link', () => {
    render(<GroupCard group={{ ...group, id: 'optimistic-1' }} />, { wrapper: MemoryRouter });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('has no blocking accessibility violations', async () => {
    render(<GroupCard group={group} />, { wrapper: MemoryRouter });

    await expectNoBlockingAccessibilityViolations();
  });
});
