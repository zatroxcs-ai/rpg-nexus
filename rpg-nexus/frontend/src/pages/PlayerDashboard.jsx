// 📍 Fichier : frontend/src/pages/PlayerDashboard.jsx
// 🎯 Rôle : Tableau de bord du joueur
// 💡 Liste des parties où le joueur est invité

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gameAPI } from '../services/api';

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const data = await gameAPI.getJoinedGames();
      setGames(data);
    } catch (error) {
      console.error('Erreur chargement parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = (gameId) => {
    navigate(`/game/${gameId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⚔️ Mes Aventures</h1>
            <p className="text-gray-500 mt-1">Bienvenue, {user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {games.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">⚔️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucune partie en cours
            </h3>
            <p className="text-gray-500">
              Attends qu'un Maître du Jeu t'invite à rejoindre une aventure !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden cursor-pointer"
                onClick={() => handleJoinGame(game.id)}
              >
                {/* Image de couverture */}
                <div
                  className="h-40 bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center"
                  style={
                    game.coverImage
                      ? { backgroundImage: `url(${game.coverImage})`, backgroundSize: 'cover' }
                      : {}
                  }
                >
                  {!game.coverImage && (
                    <div className="text-6xl">🎲</div>
                  )}
                </div>

                {/* Infos */}
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {game.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {game.description || 'Une aventure palpitante t\'attend...'}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>🎭 {game.owner?.username}</span>
                    <span className={game.isActive ? 'text-green-500' : 'text-gray-400'}>
                      {game.isActive ? '● En ligne' : '○ Hors ligne'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleJoinGame(game.id)}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                  >
                    Rejoindre la partie
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
