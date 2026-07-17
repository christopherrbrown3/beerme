import { Outlet } from 'react-router-dom';

import { BeerMeMark } from '../brand/BeerMeMark';

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <div className="auth-layout__brand">
        <BeerMeMark />
        <p>Good friends. Clear tabs.</p>
      </div>
      <Outlet />
      <p className="auth-layout__footer">Friendly IOUs—not financial advice.</p>
    </main>
  );
}
