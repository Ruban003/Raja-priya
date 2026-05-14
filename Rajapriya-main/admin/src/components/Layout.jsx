import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const navItems = [
  { path: '/', icon: '⊞', label: 'Dashboard' },
  { path: '/appointments', icon: '◷', label: 'Appointments' },
  { path: '/billing', icon: '◈', label: 'Billing' },
  { path: '/customers', icon: '◉', label: 'Customers' },
  { path: '/services', icon: '✦', label: 'Services' },
  { path: '/staff', icon: '◎', label: 'Staff' },
  { path: '/campaigns', icon: '◆', label: 'Campaigns', hideFor: ['manager'] },
  { path: '/reports', icon: '◐', label: 'Reports' },
  { path: '/settings', icon: '◍', label: 'Settings', hideFor: ['manager', 'center_admin'] },
];

const roleLabels = {
  rv_owner: 'RV Owner', rv_admin: 'RV Admin',
  center_owner: 'Center Owner', center_admin: 'Center Admin', manager: 'Manager'
};

export default function Layout() {
  const { user, logout, isRVLevel, selectedCenter, selectCenter, getActiveCenterId } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [centers, setCenters] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (isRVLevel()) {
      api.get('/centers').then(r => {
        setCenters(r.data);
      }).catch(e => console.error(e));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.center-selector-wrap')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const visibleNav = navItems.filter(item => !item.hideFor?.includes(user?.role));
  const activeCenterName = isRVLevel() ? (selectedCenter?.name || 'Select Center') : 'Glam';
  const hasCenter = !!getActiveCenterId();

  const handleCenterClick = (center) => {
    selectCenter(center);
    setDropdownOpen(false);
  };

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

        {/* CENTER SELECTOR — only for RV level */}
        {!collapsed && isRVLevel() && (
          <div className="center-selector-wrap">
            <button
              className="center-selector-btn"
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(o => !o); }}
            >
              <div>
                <span className="center-selector-label">CENTER</span>
                <span className="center-selector-value">{activeCenterName}</span>
              </div>
              <span className="center-arrow">{dropdownOpen ? '▴' : '▾'}</span>
            </button>

            {dropdownOpen && (
              <div className="center-dropdown">
                <div
                  className={`center-option ${!selectedCenter ? 'selected' : ''}`}
                  onClick={() => handleCenterClick(null)}
                >
                  🌐 All Centers
                </div>
                {centers.map(c => (
                  <div
                    key={c._id}
                    className={`center-option ${selectedCenter?._id === c._id ? 'selected' : ''}`}
                    onClick={() => handleCenterClick(c)}
                  >
                    🏪 {c.name}
                  </div>
                ))}
                {centers.length === 0 && (
                  <div className="center-option" style={{ color: 'var(--text3)', cursor: 'default' }}>
                    Loading centers...
                  </div>
                )}
              </div>
            )}
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
            {hasCenter ? (
              <div className="center-badge">📍 {activeCenterName}</div>
            ) : isRVLevel() ? (
              <div className="center-badge warning">⚠ Select a center from sidebar to add data</div>
            ) : (
              <div className="center-badge">📍 Glam</div>
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
