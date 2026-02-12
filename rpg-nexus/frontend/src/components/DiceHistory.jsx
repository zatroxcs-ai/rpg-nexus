// 📍 Fichier : frontend/src/components/DiceHistory.jsx
// 🎯 Rôle : Affiche l'historique des jets de dés
// 💡 Montre qui a lancé, quel jet, et le résultat

import { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

export default function DiceHistory() {
  const { diceRolls } = useGame();
  const { user } = useAuth();
  const historyEndRef = useRef(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [diceRolls]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDiceIcon = (diceType) => {
    const icons = {
      4: '🔺',
      6: '🎲',
      8: '🔶',
      10: '🔟',
      12: '🔷',
      20: '⭐',
      100: '💯',
    };
    return icons[diceType] || '🎲';
  };

  const getDiceColor = (diceType) => {
    const colors = {
      4: 'text-red-400',
      6: 'text-orange-400',
      8: 'text-yellow-400',
      10: 'text-green-400',
      12: 'text-blue-400',
      20: 'text-purple-400',
      100: 'text-pink-400',
    };
    return colors[diceType] || 'text-gray-400';
  };

  if (diceRolls.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-8">
        <div className="text-4xl mb-2">🎲</div>
        <p>Aucun jet de dés pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {diceRolls.map((roll) => {
        const isMe = roll.username === user?.username;
        const isMJ = roll.role === 'ADMIN';
        const isCriticalSuccess = roll.diceType === 20 && roll.results.includes(20);
        const isCriticalFailure = roll.diceType === 20 && roll.results.includes(1);

        return (
          <div
            key={roll.id}
            className={`p-3 rounded-lg border-2 ${
              isCriticalSuccess
                ? 'bg-green-900 bg-opacity-30 border-green-500'
                : isCriticalFailure
                ? 'bg-red-900 bg-opacity-30 border-red-500'
                : 'bg-gray-700 bg-opacity-50 border-gray-600'
            }`}
          >
            {/* En-tête : Qui et quand */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {isMJ ? '🎭' : '⚔️'}
                </span>
                <span className="font-semibold text-sm">
                  {isMe ? 'Toi' : roll.username}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatTime(roll.timestamp)}
              </span>
            </div>

            {/* Raison du jet (si présente) */}
            {roll.reason && (
              <div className="text-xs text-gray-400 mb-2 italic">
                {roll.reason}
              </div>
            )}

            {/* Formule du jet */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-2xl ${getDiceColor(roll.diceType)}`}>
                {getDiceIcon(roll.diceType)}
              </span>
              <span className="text-lg font-mono">
                {roll.count}d{roll.diceType}
                {roll.modifier !== 0 && (
                  <span className={roll.modifier > 0 ? 'text-green-400' : 'text-red-400'}>
                    {roll.modifier > 0 ? '+' : ''}{roll.modifier}
                  </span>
                )}
              </span>
            </div>

            {/* Détails des résultats */}
            <div className="flex flex-wrap gap-2 mb-2">
              {roll.results.map((result, index) => (
                <div
                  key={index}
                  className={`px-2 py-1 rounded font-mono text-sm ${
                    result === roll.diceType
                      ? 'bg-green-600 text-white' // Maximum
                      : result === 1
                      ? 'bg-red-600 text-white' // Minimum
                      : 'bg-gray-600 text-white'
                  }`}
                >
                  {result}
                </div>
              ))}
              {roll.modifier !== 0 && (
                <div className="px-2 py-1 rounded font-mono text-sm bg-blue-600 text-white">
                  {roll.modifier > 0 ? '+' : ''}{roll.modifier}
                </div>
              )}
            </div>

            {/* Résultat total */}
            <div className="text-right">
              <span className="text-xs text-gray-400 mr-2">Total :</span>
              <span className={`text-2xl font-bold ${
                isCriticalSuccess
                  ? 'text-green-400'
                  : isCriticalFailure
                  ? 'text-red-400'
                  : 'text-white'
              }`}>
                {roll.total}
              </span>
            </div>

            {/* Message de critique */}
            {isCriticalSuccess && (
              <div className="text-center text-green-400 text-sm font-bold mt-2">
                ✨ CRITIQUE ! ✨
              </div>
            )}
            {isCriticalFailure && (
              <div className="text-center text-red-400 text-sm font-bold mt-2">
                💥 ÉCHEC CRITIQUE ! 💥
              </div>
            )}
          </div>
        );
      })}
      <div ref={historyEndRef} />
    </div>
  );
}
