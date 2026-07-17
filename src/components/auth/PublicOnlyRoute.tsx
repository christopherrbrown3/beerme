import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { LoadingScreen } from '../ui/LoadingScreen';

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen label="Getting things ready…" />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
