import { Navigate, Outlet, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { getSafeNextPath } from '../../utils/redirect';
import { LoadingScreen } from '../ui/LoadingScreen';

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();

  if (isLoading) return <LoadingScreen label="Getting things ready…" />;
  if (user) return <Navigate to={getSafeNextPath(searchParams.get('next'))} replace />;

  return <Outlet />;
}
