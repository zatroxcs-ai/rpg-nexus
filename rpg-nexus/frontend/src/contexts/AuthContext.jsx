// @refresh reset
// frontend/src/contexts/AuthContext.jsx

import { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContextDef';
import { authAPI } from '../services/api';
import websocketService from '../services/websocket';

export { AuthContext };

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser  = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      websocketService.connect(storedToken);
    }
    setLoading(false);
  }, []);

  const register = async (email, username, password, role = 'PLAYER') => {
    try {
      const data = await authAPI.register(email, username, password, role);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user',  JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      websocketService.connect(data.access_token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Erreur lors de l'inscription",
      };
    }
  };

  const login = async (emailOrUsername, password) => {
    try {
      const data = await authAPI.login(emailOrUsername, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user',  JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      websocketService.connect(data.access_token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Identifiants incorrects',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    websocketService.disconnect();
  };

  const isAdmin = ()         => user?.role === 'ADMIN';
  const isAuthenticated = () => !!token && !!user;

  const value = { user, token, loading, register, login, logout, isAdmin, isAuthenticated };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
};
