import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('rv_user');
    const token = localStorage.getItem('rv_token');
    const sc = localStorage.getItem('rv_center');
    if (stored && token) {
      const u = JSON.parse(stored);
      setUser(u);
      if (sc) setSelectedCenter(JSON.parse(sc));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('rv_token', data.token);
    localStorage.setItem('rv_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('rv_token');
    localStorage.removeItem('rv_user');
    localStorage.removeItem('rv_center');
    setUser(null); setSelectedCenter(null);
  };

  const selectCenter = (center) => {
    setSelectedCenter(center);
    localStorage.setItem('rv_center', JSON.stringify(center));
  };

  // Returns the active centerId for API calls
  const getActiveCenterId = () => {
    if (user?.centerId) return user.centerId; // center-level users
    if (selectedCenter?._id) return selectedCenter._id; // RV level with selected center
    return null;
  };

  const isRVLevel = () => ['rv_owner', 'rv_admin'].includes(user?.role);
  const canManage = () => !['manager'].includes(user?.role);
  const isOwner = () => ['rv_owner', 'center_owner'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isRVLevel, canManage, isOwner, selectedCenter, selectCenter, getActiveCenterId, centers, setCenters }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
