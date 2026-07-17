import { Route, Routes } from 'react-router-dom';

import { AuthLayout } from './components/auth/AuthLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { AppLayout } from './components/layout/AppLayout';
import { UpdatePrompt } from './components/layout/UpdatePrompt';
import { ActivityPage } from './pages/ActivityPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupLedgerPage } from './pages/GroupLedgerPage';
import { JoinGroupPage } from './pages/JoinGroupPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

export function App() {
  return (
    <>
      <UpdatePrompt />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="auth" element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="join/:token" element={<JoinGroupPage />} />
          <Route element={<AppLayout />}>
            <Route index element={<GroupsPage />} />
            <Route path="groups/:groupId" element={<GroupLedgerPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
