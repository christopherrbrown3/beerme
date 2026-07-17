import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { type PropsWithChildren, useState } from 'react';

import { AuthProvider } from '../hooks/AuthProvider';

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
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  );
}
