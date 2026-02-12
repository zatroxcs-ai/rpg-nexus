// frontend/src/components/PlayerStats.jsx
// Affiche les statistiques personnelles de jets de dés d'un joueur

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function PlayerStats() {
  const { gameId } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [gameId]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/dice/stats/player/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur chargement stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        Chargement des statistiques...
      </div>
    );
  }

  if (!stats || stats.totalRolls === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">🎲</div>
        <p>Aucun jet de dés enregistré pour le moment.</p>
        <p className="text-sm mt-2">Lancez vos premiers dés pour voir vos statistiques !</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-indigo-400">{stats.totalRolls}</div>
          <div className="text-sm text-gray-400">Jets lancés</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-green-400">{stats.average}</div>
          <div className="text-sm text-gray-400">Moyenne</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-blue-400">{stats.highest}</div>
          <div className="text-sm text-gray-400">Plus haut</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-purple-400">{stats.lowest}</div>
          <div className="text-sm text-gray-400">Plus bas</div>
        </div>
      </div>

      {/* Critiques */}
      {(stats.criticalSuccesses > 0 || stats.criticalFailures > 0) && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">🎯 Critiques (d20)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-yellow-400">{stats.criticalSuccesses}</div>
              <div className="text-sm text-gray-400">Réussites critiques (20)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.criticalFailures}</div>
              <div className="text-sm text-gray-400">Échecs critiques (1)</div>
            </div>
          </div>
        </div>
      )}

      {/* Distribution par type de dé */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold mb-3">📊 Distribution par type de dé</h3>
        <div className="space-y-2">
          {Object.entries(stats.distribution)
            .sort(([a], [b]) => {
              const numA = parseInt(a.replace('d', ''));
              const numB = parseInt(b.replace('d', ''));
              return numA - numB;
            })
            .map(([diceType, count]) => (
              <div key={diceType} className="flex items-center gap-3">
                <div className="w-16 text-sm font-semibold text-gray-300">{diceType}</div>
                <div className="flex-1 bg-gray-700 rounded-full h-6 relative">
                  <div
                    className="bg-indigo-600 h-6 rounded-full flex items-center justify-end px-2"
                    style={{
                      width: `${(count / stats.totalRolls) * 100}%`,
                    }}
                  >
                    <span className="text-xs font-semibold text-white">{count}</span>
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-400 text-right">
                  {Math.round((count / stats.totalRolls) * 100)}%
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Jets récents */}
      {stats.recentRolls && stats.recentRolls.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">📜 Jets récents</h3>
          <div className="space-y-2">
            {stats.recentRolls.map((roll, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-700 rounded"
              >
                <div>
                  <div className="font-semibold text-indigo-300">{roll.formula}</div>
                  {roll.reason && (
                    <div className="text-xs text-gray-400">{roll.reason}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-400">
                    {Array.isArray(roll.results) && roll.results.join(', ')}
                  </div>
                  <div className="text-xl font-bold text-white min-w-[3rem] text-right">
                    {roll.total}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
