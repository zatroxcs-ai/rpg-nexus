// 📍 Fichier : frontend/src/components/DiceRoller.jsx
// 🎯 Rôle : Interface pour lancer des dés
// 💡 Permet de choisir le type, le nombre, et le modificateur

import { useState } from 'react';
import { useGame } from '../contexts/GameContext';

const DICE_TYPES = [
  { value: 4, label: 'd4', color: 'bg-red-500', icon: '🔺' },
  { value: 6, label: 'd6', color: 'bg-orange-500', icon: '🎲' },
  { value: 8, label: 'd8', color: 'bg-yellow-500', icon: '🔶' },
  { value: 10, label: 'd10', color: 'bg-green-500', icon: '🔟' },
  { value: 12, label: 'd12', color: 'bg-blue-500', icon: '🔷' },
  { value: 20, label: 'd20', color: 'bg-purple-500', icon: '⭐' },
  { value: 100, label: 'd100', color: 'bg-pink-500', icon: '💯' },
];

export default function DiceRoller() {
  const { rollDice } = useGame();
  
  const [selectedDice, setSelectedDice] = useState(20); // d20 par défaut
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [reason, setReason] = useState('');

  const handleRoll = () => {
    rollDice(selectedDice, count, modifier, reason);
    // Réinitialise la raison après le jet
    setReason('');
  };

  const selectedDiceInfo = DICE_TYPES.find(d => d.value === selectedDice);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* En-tête */}
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        🎲 Lanceur de Dés
      </h3>

      {/* Sélection du type de dé */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Type de dé
        </label>
        <div className="grid grid-cols-4 gap-2">
          {DICE_TYPES.map((dice) => (
            <button
              key={dice.value}
              onClick={() => setSelectedDice(dice.value)}
              className={`p-3 rounded-lg font-bold transition ${
                selectedDice === dice.value
                  ? `${dice.color} text-white scale-105`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="text-2xl mb-1">{dice.icon}</div>
              <div className="text-sm">{dice.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Nombre de dés */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Nombre de dés
        </label>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setCount(Math.max(1, count - 1))}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
          >
            −
          </button>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="flex-1 px-3 py-2 bg-gray-700 text-white text-center rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="1"
            max="20"
          />
          <button
            onClick={() => setCount(Math.min(20, count + 1))}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Modificateur */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Modificateur (optionnel)
        </label>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setModifier(modifier - 1)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
          >
            −
          </button>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
            className="flex-1 px-3 py-2 bg-gray-700 text-white text-center rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => setModifier(modifier + 1)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Raison du jet */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Raison (optionnel)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Attaque, Perception..."
          className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          maxLength={50}
        />
      </div>

      {/* Aperçu du jet */}
      <div className="mb-4 p-3 bg-gray-900 rounded text-center">
        <div className="text-sm text-gray-400 mb-1">Tu vas lancer :</div>
        <div className="text-2xl font-bold">
          {count}d{selectedDice}
          {modifier !== 0 && (
            <span className={modifier > 0 ? 'text-green-400' : 'text-red-400'}>
              {modifier > 0 ? '+' : ''}{modifier}
            </span>
          )}
        </div>
        {reason && (
          <div className="text-sm text-gray-400 mt-1">
            ({reason})
          </div>
        )}
      </div>

      {/* Bouton lancer */}
      <button
        onClick={handleRoll}
        className={`w-full py-3 rounded-lg font-bold text-white transition ${selectedDiceInfo.color} hover:opacity-90`}
      >
        🎲 Lancer !
      </button>
    </div>
  );
}
