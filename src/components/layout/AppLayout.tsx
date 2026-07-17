import { Outlet } from 'react-router-dom';

import { useAppRealtime } from '../../hooks/useAppRealtime';
import { BeerMeMark } from '../brand/BeerMeMark';
import { BottomNavigation } from './BottomNavigation';
import { NetworkStatus } from './NetworkStatus';

export function AppLayout() {
  useAppRealtime();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header__inner">
          <BeerMeMark />
          <span className="app-header__status">Friendly tabs, settled simply.</span>
        </div>
      </header>
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      <BottomNavigation />
      <NetworkStatus />
    </div>
  );
}
