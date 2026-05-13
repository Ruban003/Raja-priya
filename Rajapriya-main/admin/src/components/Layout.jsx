import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', icon: '⊞', label: 'Dashboard', roles: ['all'] },
  { path: '/appointments', icon: '◷', label: 'Appointments', roles: ['all'] },
  { path: '/billing', icon: '◈', label: 'Billing', roles: ['all'] },
  { path: '/customers', icon: '◉', label: 'Customers', roles: ['all'] },
  { path: '/services', icon: '✦', label: 'Services', roles: ['all'] },
  { path: '/staff', icon: '◎', label: 'Staff', roles: ['all'] },
  { path: '/campaigns', icon: '◆', label: 'Campaigns', roles: ['rv_owner','rv_admin','center_owner','center_admin'] },
  { path: '/reports', icon: '◐', label: 'Reports', roles: ['all'] },
  { path: '/settings', icon: '◍', label: 'Settings', roles: ['rv_owner','rv_admin','center_owner'] },
];

const roleLabels = {
  rv_owner: 'RV Owner',
  rv_admin: 'RV Admin',
  center_owner: 'Center Owner',
  center_admin: 'Center Admin',
  manager: 'Manager',
};

export default function Layout() {
  const { user, logout, isRVLevel } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = navItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(user?.role)
  );

  return (
    <div className={`app-layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">RV</div>
          {!collapsed && (
            <div className="sidebar-title">
              <span className="brand-name">RV Salon</span>
              <span className="brand-sub">Management</span>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed && user && (
          <div className="sidebar-user">
            <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{roleLabels[user.role]}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {visibleNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">⏻</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            {isRVLevel() && (
              <div className="center-badge">All Centers</div>
            )}
            {!isRVLevel() && user?.centerId && (
              <div className="center-badge">Glam Center</div>
            )}
          </div>
          <div className="topbar-right">
            <div className="topbar-user">
              <div className="topbar-avatar">{user?.name?.charAt(0)}</div>
              <span>{user?.name}</span>
            </div>
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
