import { Route, Routes } from 'react-router-dom';

import { AuthLayout } from './components/auth/AuthLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ActivityPage } from './pages/ActivityPage';
import { GroupsPage } from './pages/GroupsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { CheckEmailPage } from './pages/auth/CheckEmailPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="check-email" element={<CheckEmailPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<GroupsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
