import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { type User } from '@supabase/supabase-js';
import { type PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../hooks/authContext';
import { UserScopedQueryCache } from './AppProviders';

function authValue(userId: string | null, isLoading = false): AuthContextValue {
  const user = userId ? ({ id: userId } as User) : null;
  return {
    user,
    session: null,
    isLoading,
    isConfigured: true,
    signOut: vi.fn(),
  };
}

function CacheHarness({
  client,
  auth,
  children,
}: PropsWithChildren<{ client: QueryClient; auth: AuthContextValue }>) {
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <UserScopedQueryCache>{children}</UserScopedQueryCache>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('UserScopedQueryCache', () => {
  it('clears cached account data when the authenticated identity changes', async () => {
    const client = new QueryClient();
    const { rerender } = render(<CacheHarness client={client} auth={authValue('user-1')} />);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    client.setQueryData(['activity'], ['private user-1 event']);

    rerender(<CacheHarness client={client} auth={authValue('user-2')} />);
    await waitFor(() => expect(client.getQueryData(['activity'])).toBeUndefined());
  });

  it('keeps cached data through loading resolution and same-user token refreshes', async () => {
    const client = new QueryClient();
    client.setQueryData(['activity'], ['safe existing event']);
    const { rerender } = render(<CacheHarness client={client} auth={authValue(null, true)} />);

    rerender(<CacheHarness client={client} auth={authValue('user-1')} />);
    await waitFor(() => expect(client.getQueryData(['activity'])).toBeDefined());

    rerender(<CacheHarness client={client} auth={authValue('user-1')} />);
    expect(client.getQueryData(['activity'])).toEqual(['safe existing event']);
  });
});
