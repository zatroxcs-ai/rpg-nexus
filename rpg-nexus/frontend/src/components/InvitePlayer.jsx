// frontend/src/components/InvitePlayer.jsx
// Interface pour inviter des joueurs à une partie

import { useState } from 'react';

export default function InvitePlayer({ gameId, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/game/${gameId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de l\'invitation');
      }

      setSuccess('✅ Joueur invité avec succès !');
      setEmail('');
      
      if (onInvited) {
        onInvited();
      }

      // Ferme après 2 secondes
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">👥 Inviter un Joueur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Email du joueur
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joueur@example.com"
              required
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              Le joueur doit avoir un compte avec cet email
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Succès */}
          {success && (
            <div className="p-3 bg-green-900 bg-opacity-30 border border-green-500 rounded text-green-200 text-sm">
              {success}
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Envoi...' : '✉️ Inviter'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-900 bg-opacity-20 border border-blue-500 rounded text-blue-200 text-xs">
          💡 <strong>Astuce :</strong> Le joueur invité pourra rejoindre la partie depuis son onglet "Mes Parties".
        </div>
      </div>
    </div>
  );
}
