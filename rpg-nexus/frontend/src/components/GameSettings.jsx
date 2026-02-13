import { useState, useEffect } from 'react';
import { gameAPI } from '../services/api';
import api from '../services/api';

export default function GameSettings({ gameId, game, players, onClose, onGameUpdated, onDeleteGame, onNavigate }) {
  const [activeSection, setActiveSection] = useState('general');
  const [gameName, setGameName] = useState(game?.name || '');
  const [gameDescription, setGameDescription] = useState(game?.description || '');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [kickConfirm, setKickConfirm] = useState(null);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  useEffect(() => {
    if (activeSection === 'players') loadGamePlayers();
  }, [activeSection]);

  const loadGamePlayers = async () => {
    setLoadingPlayers(true);
    try {
      const data = await gameAPI.getGameById(gameId);
      setGamePlayers(data.players || []);
    } catch (e) {
      console.error('Failed to load players:', e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await gameAPI.updateGame(gameId, {
        name: gameName.trim(),
        description: gameDescription.trim(),
      });
      if (onGameUpdated) onGameUpdated();
    } catch (e) {
      alert('Erreur: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleKickPlayer = async (playerId) => {
    try {
      await gameAPI.removePlayer(gameId, playerId);
      setKickConfirm(null);
      await loadGamePlayers();
    } catch (e) {
      alert('Erreur: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/game/${gameId}/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${game?.name || 'campaign'}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors de l'export: " + err.message);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        setImportStatus('loading');
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await fetch(`http://localhost:3000/api/game/${gameId}/import`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Import failed');
        const result = await res.json();
        const summary = Object.entries(result.imported)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ');
        setImportStatus('success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        setImportStatus('error');
        alert("Erreur lors de l'import: " + err.message);
        setTimeout(() => setImportStatus(null), 2000);
      }
    };
    input.click();
  };

  const handleDeleteGame = async () => {
    try {
      await gameAPI.deleteGame(gameId);
      if (onNavigate) onNavigate('/dashboard');
    } catch (e) {
      alert('Erreur: ' + (e.response?.data?.message || e.message));
    }
  };

  const sections = [
    { id: 'general', label: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'players', label: 'Joueurs', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'data', label: 'Donnees', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { id: 'danger', label: 'Zone Danger', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex overflow-hidden shadow-2xl border border-gray-700">
        <div className="w-52 bg-gray-900 border-r border-gray-700 flex flex-col py-4 shrink-0">
          <h2 className="text-white font-bold text-lg px-5 mb-4">Options</h2>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition text-left ${
                activeSection === s.id
                  ? 'bg-gray-700 text-white border-r-2 border-indigo-500'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
              </svg>
              {s.label}
            </button>
          ))}
          <div className="mt-auto px-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'general' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Parametres generaux</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom de la partie</label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Decrivez votre campagne..."
                />
              </div>

              <button
                onClick={handleSaveGeneral}
                disabled={saving || !gameName.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}

          {activeSection === 'players' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Gestion des joueurs</h3>
              <p className="text-sm text-gray-400">
                {players?.length || 0} joueur(s) connecte(s) actuellement
              </p>

              {loadingPlayers ? (
                <div className="text-gray-400 text-center py-8">Chargement...</div>
              ) : gamePlayers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Aucun joueur invite</div>
              ) : (
                <div className="space-y-2">
                  {gamePlayers.map(gp => {
                    const p = gp.player || gp;
                    const isOnline = players?.some(op => op.id === p.id || op.username === p.username);
                    return (
                      <div key={gp.id || p.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <div>
                            <div className="text-white font-medium">{p.username}</div>
                            <div className="text-xs text-gray-400">{p.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${isOnline ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-400'}`}>
                            {isOnline ? 'En ligne' : 'Hors ligne'}
                          </span>
                          {kickConfirm === (gp.id || p.id) ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleKickPlayer(gp.playerId || p.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setKickConfirm(null)}
                                className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded transition"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setKickConfirm(gp.id || p.id)}
                              className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded transition"
                            >
                              Retirer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Import / Export</h3>

              <div className="p-5 bg-gray-700 rounded-xl space-y-3">
                <h4 className="font-semibold text-white">Exporter la partie</h4>
                <p className="text-sm text-gray-400">
                  Telecharge un fichier JSON contenant toutes les donnees de la partie :
                  personnages, monstres, PNJ, items, notes, quetes, carte tactique, etc.
                </p>
                <button
                  onClick={handleExport}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exporter en JSON
                </button>
              </div>

              <div className="p-5 bg-gray-700 rounded-xl space-y-3">
                <h4 className="font-semibold text-white">Importer des donnees</h4>
                <p className="text-sm text-gray-400">
                  Importe des donnees depuis un fichier JSON. Les elements importes seront ajoutes
                  a la partie existante sans ecraser les donnees actuelles.
                </p>
                <button
                  onClick={handleImport}
                  disabled={importStatus === 'loading'}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {importStatus === 'loading' ? 'Import en cours...' : importStatus === 'success' ? 'Import reussi !' : 'Importer un fichier JSON'}
                </button>
                {importStatus === 'success' && (
                  <p className="text-sm text-green-400">Import reussi ! Rechargement...</p>
                )}
              </div>
            </div>
          )}

          {activeSection === 'danger' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-red-400">Zone Danger</h3>
              <p className="text-sm text-gray-400">
                Ces actions sont irreversibles. Soyez prudent.
              </p>

              <div className="p-5 bg-red-900 bg-opacity-20 border border-red-800 rounded-xl space-y-3">
                <h4 className="font-semibold text-red-300">Supprimer la partie</h4>
                <p className="text-sm text-gray-400">
                  Supprime definitivement la partie et toutes ses donnees : personnages, monstres,
                  PNJ, items, notes, quetes, messages, etc. Cette action est irreversible.
                </p>
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition"
                  >
                    Supprimer cette partie
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-red-300 text-sm font-medium">Etes-vous sur ?</span>
                    <button
                      onClick={handleDeleteGame}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition"
                    >
                      Oui, supprimer
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg font-semibold transition"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
