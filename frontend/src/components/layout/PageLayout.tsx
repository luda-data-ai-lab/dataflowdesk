import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';

export function PageLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
