// 📍 Fichier : frontend/src/App.jsx
// 🎯 Rôle : Composant racine avec le système de routage
// 💡 Gère la navigation et les routes protégées

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import LoginPage from './pages/LoginPage';
import GMDashboard from './pages/GMDashboard';
import PlayerDashboard from './pages/PlayerDashboard';
import GameView from './pages/GameView';

// Composant pour protéger les routes
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/dashboard/player" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Page de connexion */}
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'ADMIN' ? '/dashboard/gm' : '/dashboard/player'} replace /> : <LoginPage />}
      />

      {/* Dashboard MJ */}
      <Route
        path="/dashboard/gm"
        element={
          <ProtectedRoute requireAdmin>
            <GMDashboard />
          </ProtectedRoute>
        }
      />

      {/* Dashboard Joueur */}
      <Route
        path="/dashboard/player"
        element={
          <ProtectedRoute>
            <PlayerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Vue de jeu */}
      <Route
        path="/game/:gameId"
        element={
          <ProtectedRoute>
            <GameView />
          </ProtectedRoute>
        }
      />

      {/* Redirection par défaut */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'ADMIN' ? '/dashboard/gm' : '/dashboard/player'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <AppRoutes />
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
