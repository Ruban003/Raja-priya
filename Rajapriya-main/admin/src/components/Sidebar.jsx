import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaChartPie, FaCalendarAlt, FaMoneyBillWave, FaUsers, FaUserTie, FaCut, FaSignOutAlt } from 'react-icons/fa';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? "sidebar-link active" : "sidebar-link";

  return (
    <div className="sidebar-container">
      {/* BRANDING */}
      <div className="p-6 text-center border-b border-gray-800">
        <h1 className="text-2xl text-white font-bold tracking-widest">
          GLAM<span className="text-gold">PRO</span>
        </h1>
      </div>

      {/* USER PROFILE */}
      <div className="p-6 flex items-center gap-4 bg-black/10">
        <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold border border-blue-700">
            {user?.username?.[0].toUpperCase()}
        </div>
        <div>
            <div className="text-white text-sm font-bold capitalize">{user?.username}</div>
            <div className="text-xs text-blue-400 uppercase font-bold">{user?.role}</div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 overflow-y-auto mt-4">
        <Link to="/dashboard" className={isActive('/dashboard')}> <FaChartPie /> Dashboard </Link>
        <Link to="/calendar" className={isActive('/calendar')}> <FaCalendarAlt /> Calendar </Link>
        <Link to="/billing" className={isActive('/billing')}> <FaMoneyBillWave /> Billing </Link>
        <Link to="/clients" className={isActive('/clients')}> <FaUsers /> Clients </Link>

        {user?.role === 'admin' && (
          <>
            <div className="text-xs uppercase text-gray-600 font-bold px-6 mt-8 mb-2">Management</div>
            <Link to="/staff" className={isActive('/staff')}> <FaUserTie /> Staff </Link>
            <Link to="/services" className={isActive('/services')}> <FaCut /> Services </Link>
          </>
        )}
      </div>

      {/* LOGOUT */}
      <div className="p-4 border-t border-gray-800 mt-auto">
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-900/30 p-3 rounded-lg transition-all font-bold">
            <FaSignOutAlt /> Log Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;