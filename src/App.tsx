import { Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/layout/AppLayout';
import { ActivityPage } from './pages/ActivityPage';
import { GroupsPage } from './pages/GroupsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<GroupsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
