import { Navigate, Route, Routes } from 'react-router-dom';

import { PageLayout } from './components/layout/PageLayout';
import { BrandingProvider } from './contexts/BrandingContext';
import { InterfaceListPage } from './pages/InterfaceListPage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemManagePage } from './pages/SystemManagePage';
import { TopologyPage } from './pages/TopologyPage';

export default function App() {
  return (
    <BrandingProvider>
      <Routes>
        <Route element={<PageLayout />}>
          <Route index element={<Navigate to="/interfaces" replace />} />
          <Route path="/interfaces" element={<InterfaceListPage />} />
          <Route path="/systems" element={<SystemManagePage />} />
          <Route path="/topology" element={<TopologyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/interfaces" replace />} />
        </Route>
      </Routes>
    </BrandingProvider>
  );
}
