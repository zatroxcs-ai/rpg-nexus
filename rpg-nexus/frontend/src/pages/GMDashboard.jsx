// 📍 Fichier : frontend/src/pages/GMDashboard.jsx
// 🎯 Rôle : Tableau de bord du Maître du Jeu
// 💡 Gérer les parties, créer/modifier/supprimer

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gameAPI } from '../services/api';

export default function GMDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Formulaire de création
  const [newGame, setNewGame] = useState({
    name: '',
    description: '',
    coverImage: '',
  });

  // Charger les parties du MJ
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const data = await gameAPI.getMyGames();
      setGames(data);
    } catch (error) {
      console.error('Erreur chargement parties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Créer une partie
  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      await gameAPI.createGame(
        newGame.name,
        newGame.description,
        newGame.coverImage || null,
        {}
      );
      
      setShowCreateModal(false);
      setNewGame({ name: '', description: '', coverImage: '' });
      loadGames();
    } catch (error) {
      alert('Erreur lors de la création de la partie');
    }
  };

  // Supprimer une partie
  const handleDeleteGame = async (gameId, gameName) => {
    if (confirm(`Supprimer la partie "${gameName}" ?`)) {
      try {
        await gameAPI.deleteGame(gameId);
        loadGames();
      } catch (error) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  // Rejoindre une partie
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
            <h1 className="text-3xl font-bold text-gray-900">🎭 Tableau de Bord MJ</h1>
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
        
        {/* Bouton créer une partie */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Créer une Partie
          </button>
        </div>

        {/* Liste des parties */}
        {games.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🎲</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucune partie créée
            </h3>
            <p className="text-gray-500">
              Crée ta première partie pour commencer l'aventure !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                {/* Image de couverture */}
                <div
                  className="h-40 bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
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
                    {game.description || 'Aucune description'}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>👥 {game.playersCount} joueur(s)</span>
                    <span className={game.isActive ? 'text-green-500' : 'text-red-500'}>
                      {game.isActive ? '● En ligne' : '○ Hors ligne'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
                    >
                      Rejoindre
                    </button>
                    <button
                      onClick={() => handleDeleteGame(game.id, game.name)}
                      className="px-4 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Créer une Partie</h2>
            
            <form onSubmit={handleCreateGame}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la partie *
                  </label>
                  <input
                    type="text"
                    value={newGame.name}
                    onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newGame.description}
                    onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image de couverture (URL)
                  </label>
                  <input
                    type="url"
                    value={newGame.coverImage}
                    onChange={(e) => setNewGame({ ...newGame, coverImage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
