import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { LoadingScreen } from '../ui/LoadingScreen';

export function ProtectedRoute() {
  const { user, isLoading, isConfigured } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen label="Checking your tab…" />;

  const next = `${location.pathname}${location.search}`;
  const loginPath = `/auth/login?next=${encodeURIComponent(next)}`;

  if (!isConfigured) {
    return <Navigate to={loginPath} replace state={{ configurationMissing: true }} />;
  }

  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}
