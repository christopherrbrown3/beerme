import { Outlet } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { LandingPage } from '../../pages/LandingPage';
import { LoadingScreen } from '../ui/LoadingScreen';

export function HomeRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen label="Getting things ready…" />;
  if (!user) return <LandingPage />;

  return <Outlet />;
}
