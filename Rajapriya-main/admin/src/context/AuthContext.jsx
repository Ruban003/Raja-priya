import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('rv_user');
    const token = localStorage.getItem('rv_token');
    if (stored && token) setUser(JSON.parse(stored));
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
    setUser(null);
  };

  const isRVLevel = () => ['rv_owner', 'rv_admin'].includes(user?.role);
  const canManage = () => !['manager'].includes(user?.role);
  const isOwner = () => ['rv_owner', 'center_owner'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isRVLevel, canManage, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
