import { Navigate, Route, Routes } from 'react-router-dom';

import { PageLayout } from './components/layout/PageLayout';
import { InterfaceListPage } from './pages/InterfaceListPage';
import { SystemManagePage } from './pages/SystemManagePage';

export default function App() {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        <Route index element={<Navigate to="/interfaces" replace />} />
        <Route path="/interfaces" element={<InterfaceListPage />} />
        <Route path="/systems" element={<SystemManagePage />} />
        <Route path="*" element={<Navigate to="/interfaces" replace />} />
      </Route>
    </Routes>
  );
}
