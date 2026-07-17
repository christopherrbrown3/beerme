import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { AuthProvider } from '../hooks/AuthProvider';
import { useAuth } from '../hooks/useAuth';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserScopedQueryCache>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </UserScopedQueryCache>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function UserScopedQueryCache({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isLoading) return;

    const nextUserId = user?.id ?? null;
    if (previousUserId.current === undefined) {
      previousUserId.current = nextUserId;
      return;
    }

    if (previousUserId.current !== nextUserId) {
      queryClient.clear();
      previousUserId.current = nextUserId;
    }
  }, [isLoading, queryClient, user?.id]);

  return children;
}
