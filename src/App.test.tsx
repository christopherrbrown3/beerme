import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { AppProviders } from './lib/AppProviders';

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'friend@example.com' } as { id: string; email: string } | null,
  isConfigured: true,
}));

const groupsState = vi.hoisted(() => ({
  data: [] as unknown[],
}));

const ledgerState = vi.hoisted(() => ({
  group: {
    id: 'group-1',
    name: 'Friday Crew',
    description: 'Neighborhood regulars',
    ownerId: 'user-1',
    inviteToken: '123e4567-e89b-42d3-a456-426614174000',
    createdAt: '2026-07-17T00:00:00.000Z',
    memberCount: 2,
    role: 'owner' as const,
    currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
    members: [
      {
        userId: 'user-1',
        role: 'owner' as const,
        joinedAt: '2026-07-17T00:00:00.000Z',
        username: 'chris',
        displayName: 'Chris',
      },
      {
        userId: 'user-2',
        role: 'member' as const,
        joinedAt: '2026-07-17T00:00:00.000Z',
        username: 'alex',
        displayName: 'Alex',
      },
    ],
  },
  transactions: [
    {
      id: 'transaction-1',
      groupId: 'group-1',
      debtor: { id: 'user-2', username: 'alex', displayName: 'Alex' },
      creditor: { id: 'user-1', username: 'chris', displayName: 'Chris' },
      quantity: 2,
      note: 'Trivia night',
      createdBy: { id: 'user-1', username: 'chris', displayName: 'Chris' },
      createdAt: '2026-07-17T00:00:00.000Z',
      reversedAt: null,
      reversedBy: null,
    },
  ],
}));

vi.mock('./hooks/AuthProvider', () => ({
  AuthProvider: ({ children }: PropsWithChildren) => children,
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: authState.user,
    session: authState.user ? { user: authState.user } : null,
    isLoading: false,
    isConfigured: authState.isConfigured,
    signOut: vi.fn(),
  }),
}));

vi.mock('./hooks/useGroups', () => ({
  useGroups: () => ({
    data: groupsState.data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateGroup: () => ({
    isPending: false,
    isError: false,
    mutateAsync: vi.fn(),
  }),
  useJoinGroup: () => ({
    isPending: false,
    isError: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('./hooks/useGroupLedger', () => ({
  useGroupDetails: () => ({
    data: ledgerState.group,
    isLoading: false,
    isError: false,
  }),
  useTransactions: () => ({
    data: ledgerState.transactions,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useLedgerRealtime: vi.fn(),
  useAddTransaction: () => ({ isPending: false, isError: false, mutateAsync: vi.fn() }),
  useReverseTransaction: () => ({ isPending: false, isError: false, mutateAsync: vi.fn() }),
}));

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('BeerMe app shell', () => {
  beforeEach(() => {
    authState.user = { id: 'user-1', email: 'friend@example.com' };
    authState.isConfigured = true;
    groupsState.data = [];
  });

  it('renders the groups home as the default route', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: 'Good friends. Clear tabs.' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your first group' })).toBeInTheDocument();
  });

  it('moves between primary routes without losing the app shell', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('link', { name: 'Activity' }));
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByLabelText('BeerMe')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Profile' }));
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });

  it('opens the create-group flow from the empty dashboard', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Create your first group' }));

    expect(screen.getByRole('dialog', { name: 'Create a group' })).toBeInTheDocument();
    expect(screen.getByLabelText('Group name')).toBeInTheDocument();
  });

  it('renders real group summaries from the dashboard query', () => {
    groupsState.data = [
      {
        id: 'group-1',
        name: 'Friday Crew',
        description: 'Neighborhood regulars',
        ownerId: 'user-1',
        inviteToken: '123e4567-e89b-42d3-a456-426614174000',
        createdAt: '2026-07-17T00:00:00.000Z',
        memberCount: 4,
        role: 'owner',
        currency: { name: 'Beer', plural: 'Beers', symbol: '🍺' },
        currentUserBalance: 2,
        lastActivityAt: '2026-07-17T00:00:00.000Z',
      },
    ];
    renderApp();

    expect(screen.getByRole('heading', { name: 'Friday Crew' })).toBeInTheDocument();
    expect(screen.getByText('4 members')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('You are owed')).toBeInTheDocument();
    expect(screen.getByText('2 Beers')).toBeInTheDocument();
  });

  it('renders the group dashboard, quick transaction flow, and history', async () => {
    const user = userEvent.setup();
    renderApp('/groups/group-1');

    expect(screen.getByRole('heading', { name: 'Friday Crew' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'People' })).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Your group balance' });
    expect(within(summary).getByText('You are owed')).toBeInTheDocument();
    expect(within(summary).getByText('2 Beers')).toBeInTheDocument();
    expect(screen.getByText('Alex owes you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add transaction' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'I owe Alex' }));
    const dialog = screen.getByRole('dialog', { name: 'Add to the ledger' });
    expect(within(dialog).getByLabelText('Transaction direction')).toHaveTextContent(
      'ChrisowesAlex',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('heading', { name: 'Transaction history' })).toBeInTheDocument();
    expect(screen.getByText(/Trivia night/)).toBeInTheDocument();
  });

  it('renders a useful not-found route', () => {
    renderApp('/lost-round');

    expect(screen.getByRole('heading', { name: 'Nothing’s pouring here.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to groups/i })).toHaveAttribute('href', '/');
  });

  it('redirects signed-out visitors to login', () => {
    authState.user = null;
    renderApp('/activity');

    expect(screen.getByRole('heading', { name: 'Sign in to your crew.' })).toBeInTheDocument();
  });
});
