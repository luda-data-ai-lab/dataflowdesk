import { Navigate, Route, Routes } from 'react-router-dom';

import { PageLayout } from './components/layout/PageLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import { AuthProvider } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { ChangeLogPage } from './pages/ChangeLogPage';
import { DashboardPage } from './pages/DashboardPage';
import { InterfaceListPage } from './pages/InterfaceListPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemManagePage } from './pages/SystemManagePage';
import { TopologyPage } from './pages/TopologyPage';
import { UserManagePage } from './pages/UserManagePage';

export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<PageLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/interfaces" element={<InterfaceListPage />} />
              <Route path="/systems" element={<SystemManagePage />} />
              <Route path="/topology" element={<TopologyPage />} />
              <Route path="/history" element={<ChangeLogPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route element={<RequireAuth adminOnly />}>
                <Route path="/users" element={<UserManagePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrandingProvider>
  );
}
