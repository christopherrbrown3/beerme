import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { LoadingScreen } from '../ui/LoadingScreen';

export function ProtectedRoute() {
  const { user, isLoading, isConfigured } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen label="Checking your tab…" />;

  if (!isConfigured) {
    return <Navigate to="/auth/login" replace state={{ configurationMissing: true }} />;
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
