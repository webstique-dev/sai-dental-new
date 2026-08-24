import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import ReceptionistQuickActions from './ReceptionistQuickActions.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DashboardLayout({ title }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  const isReceptionist = user?.role === 'receptionist';

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        role={user.role}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div
        className={`flex min-h-screen flex-1 flex-col min-w-0 max-w-full overflow-x-hidden transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          title={title}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main className="flex-1 p-3 sm:p-6 pb-20 md:pb-6 min-w-0 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
        {isReceptionist && <ReceptionistQuickActions isCollapsed={isCollapsed} />}
      </div>
    </div>
  );
}
