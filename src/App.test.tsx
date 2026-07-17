import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { AppProviders } from './lib/AppProviders';

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
  it('renders the groups home as the default route', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: 'Good friends. Clear tabs.' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByText('Group creation arrives in Milestone 3.')).toBeInTheDocument();
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

  it('renders a useful not-found route', () => {
    renderApp('/lost-round');

    expect(screen.getByRole('heading', { name: 'Nothing’s pouring here.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to groups/i })).toHaveAttribute('href', '/');
  });
});
