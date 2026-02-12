// frontend/src/components/DiceRollerAdvanced.jsx
// Lanceur de dés avancé avec formules, avantage/désavantage et favoris

import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { parseDiceFormula, rollDice, calculateTotal, rollWithAdvantage, rollWithDisadvantage } from '../lib/DiceParser';

export default function DiceRollerAdvanced() {
  const { rollDice: sendRoll, currentGame } = useGame();
  const [formula, setFormula] = useState('1d20');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('normal'); // normal, advantage, disadvantage
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState('');

  // Charger les favoris depuis le localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`dice-favorites-${currentGame?.id}`);
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, [currentGame?.id]);

  const handleRoll = () => {
    try {
      setError('');

      // Mode Avantage/Désavantage (uniquement pour 1d20)
      if (mode !== 'normal') {
        if (!formula.match(/^1d20([+-]\d+)?$/)) {
          setError('Avantage/Désavantage fonctionne uniquement avec 1d20');
          return;
        }

        const parsed = parseDiceFormula(formula);
        let result;

        if (mode === 'advantage') {
          result = rollWithAdvantage(20);
        } else {
          result = rollWithDisadvantage(20);
        }

        const total = result.kept + parsed.modifier;

        sendRoll(
          20,
          1,
          parsed.modifier,
          reason || `${mode === 'advantage' ? 'Avantage' : 'Désavantage'}: ${parsed.formula}`
        );

        return;
      }

      // Mode Normal
      const parsed = parseDiceFormula(formula);
      const results = rollDice(parsed.count, parsed.diceType);
      const total = calculateTotal(results, parsed.modifier);

      sendRoll(parsed.diceType, parsed.count, parsed.modifier, reason);
      setReason('');
    } catch (err) {
      setError(err.message);
    }
  };

  const addToFavorites = () => {
    try {
      const parsed = parseDiceFormula(formula);
      const name = reason || parsed.formula;

      if (favorites.find(f => f.formula === parsed.formula)) {
        setError('Ce jet est déjà dans les favoris');
        return;
      }

      const newFavorites = [...favorites, { formula: parsed.formula, name }];
      setFavorites(newFavorites);
      localStorage.setItem(`dice-favorites-${currentGame?.id}`, JSON.stringify(newFavorites));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeFromFavorites = (formula) => {
    const newFavorites = favorites.filter(f => f.formula !== formula);
    setFavorites(newFavorites);
    localStorage.setItem(`dice-favorites-${currentGame?.id}`, JSON.stringify(newFavorites));
  };

  const useFavorite = (fav) => {
    setFormula(fav.formula);
    setReason(fav.name);
  };

  const quickRolls = [
    { label: 'd4', formula: '1d4' },
    { label: 'd6', formula: '1d6' },
    { label: 'd8', formula: '1d8' },
    { label: 'd10', formula: '1d10' },
    { label: 'd12', formula: '1d12' },
    { label: 'd20', formula: '1d20' },
    { label: 'd100', formula: '1d100' },
  ];

  return (
    <div className="space-y-4">
      {/* Formule */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Formule de dés
        </label>
        <input
          type="text"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="Ex: 1d20+5, 3d6-2"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-indigo-500 focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Format: NdX+Y (ex: 1d20+5, 3d6, 2d8-1)
        </p>
      </div>

      {/* Jets rapides */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Jets rapides
        </label>
        <div className="flex gap-2 flex-wrap">
          {quickRolls.map((roll) => (
            <button
              key={roll.label}
              onClick={() => setFormula(roll.formula)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
            >
              {roll.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode (Normal/Avantage/Désavantage) */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Mode de jet
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('normal')}
            className={`flex-1 px-4 py-2 rounded transition ${
              mode === 'normal'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => setMode('advantage')}
            className={`flex-1 px-4 py-2 rounded transition ${
              mode === 'advantage'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎯 Avantage
          </button>
          <button
            onClick={() => setMode('disadvantage')}
            className={`flex-1 px-4 py-2 rounded transition ${
              mode === 'disadvantage'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⚠️ Désavantage
          </button>
        </div>
        {mode !== 'normal' && (
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'advantage' ? 'Lance 2d20 et garde le meilleur' : 'Lance 2d20 et garde le pire'}
          </p>
        )}
      </div>

      {/* Raison */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Raison (optionnel)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Attaque à l'épée"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-2">
        <button
          onClick={handleRoll}
          className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition"
        >
          🎲 Lancer les Dés
        </button>
        <button
          onClick={addToFavorites}
          className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          title="Ajouter aux favoris"
        >
          ⭐
        </button>
      </div>

      {/* Favoris */}
      {favorites.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            ⭐ Jets favoris
          </label>
          <div className="space-y-2">
            {favorites.map((fav, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-700 rounded"
              >
                <button
                  onClick={() => useFavorite(fav)}
                  className="flex-1 text-left hover:bg-gray-600 px-2 py-1 rounded transition"
                >
                  <div className="font-semibold text-indigo-300">{fav.formula}</div>
                  <div className="text-xs text-gray-400">{fav.name}</div>
                </button>
                <button
                  onClick={() => removeFromFavorites(fav.formula)}
                  className="px-2 py-1 text-red-400 hover:bg-red-900 hover:bg-opacity-30 rounded transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
