// @refresh reset
// 📍 Fichier : frontend/src/contexts/AuthContext.jsx
// 🎯 Rôle : Gère l'état d'authentification global de l'application
// 💡 Fournit les fonctions login, logout, register à tous les composants

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import websocketService from '../services/websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au chargement : Vérifie si l'utilisateur est déjà connecté
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Connecte le WebSocket automatiquement
      websocketService.connect(storedToken);
    }

    setLoading(false);
  }, []);

  // Inscription
  const register = async (email, username, password, role = 'PLAYER') => {
    try {
      const data = await authAPI.register(email, username, password, role);
      
      // Stocke le token et l'utilisateur
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.access_token);
      setUser(data.user);

      // Connecte le WebSocket
      websocketService.connect(data.access_token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Erreur lors de l\'inscription',
      };
    }
  };

  // Connexion
  const login = async (emailOrUsername, password) => {
    try {
      const data = await authAPI.login(emailOrUsername, password);
      
      // Stocke le token et l'utilisateur
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.access_token);
      setUser(data.user);

      // Connecte le WebSocket
      websocketService.connect(data.access_token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Identifiants incorrects',
      };
    }
  };

  // Déconnexion
  const logout = () => {
    // Supprime du localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Réinitialise l'état
    setToken(null);
    setUser(null);

    // Déconnecte le WebSocket
    websocketService.disconnect();
  };

  // Vérifie si l'utilisateur est un MJ (ADMIN)
  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };

  // Vérifie si l'utilisateur est connecté
  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const value = {
    user,
    token,
    loading,
    register,
    login,
    logout,
    isAdmin,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

