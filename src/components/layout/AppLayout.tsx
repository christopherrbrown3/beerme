import { Outlet } from 'react-router-dom';

import { BeerMeMark } from '../brand/BeerMeMark';
import { BottomNavigation } from './BottomNavigation';
import { NetworkStatus } from './NetworkStatus';
import { UpdatePrompt } from './UpdatePrompt';

export function AppLayout() {
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
      <UpdatePrompt />
    </div>
  );
}
