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
  const [macroName, setMacroName] = useState('');
  const [showAddMacro, setShowAddMacro] = useState(false);

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

  const addFavorite = (name) => {
    try {
      const parsed = parseDiceFormula(formula);

      const newFavorites = [...favorites, {
        name: name || null,
        formula: parsed.formula,
        diceType: parsed.diceType,
        count: parsed.count,
        modifier: parsed.modifier,
      }];
      setFavorites(newFavorites);
      localStorage.setItem(`dice-favorites-${currentGame?.id}`, JSON.stringify(newFavorites));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeFavorite = (idx) => {
    const newFavorites = favorites.filter((_, i) => i !== idx);
    setFavorites(newFavorites);
    localStorage.setItem(`dice-favorites-${currentGame?.id}`, JSON.stringify(newFavorites));
  };

  const handleQuickRoll = (fav) => {
    sendRoll(fav.diceType, fav.count, fav.modifier, fav.name || fav.formula);
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
      {/* Macros / Raccourcis */}
      {favorites.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Raccourcis rapides</h3>
          <div className="grid grid-cols-2 gap-2">
            {favorites.map((fav, idx) => {
              const sign = fav.modifier > 0 ? '+' + fav.modifier : fav.modifier < 0 ? String(fav.modifier) : '';
              const formula = fav.formula || `${fav.count}d${fav.diceType}${sign}`;
              return (
                <div key={idx} className="relative group">
                  <button
                    onClick={() => handleQuickRoll(fav)}
                    className="w-full text-left px-4 py-3 bg-gray-700 active:bg-indigo-700 rounded-xl transition border border-gray-600 active:border-indigo-500 min-h-[52px]"
                  >
                    <div className="text-white font-semibold text-sm truncate">{fav.name || formula}</div>
                    <div className="text-gray-400 text-xs">{formula}</div>
                  </button>
                  <button
                    onClick={() => removeFavorite(idx)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 active:bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Jets rapides - gros boutons tactiles */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Jets rapides
        </label>
        <div className="grid grid-cols-4 gap-2">
          {quickRolls.map((roll) => (
            <button
              key={roll.label}
              onClick={() => setFormula(roll.formula)}
              className={`py-3 rounded-xl text-sm font-bold transition min-h-[48px] ${
                formula === roll.formula
                  ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                  : 'bg-gray-700 text-gray-300 active:bg-gray-600 border-2 border-transparent'
              }`}
            >
              {roll.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formule */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Formule de des
        </label>
        <input
          type="text"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="Ex: 1d20+5, 3d6-2"
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-base focus:border-indigo-500 focus:outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: NdX+Y (ex: 1d20+5, 3d6, 2d8-1)
        </p>
      </div>

      {/* Mode (Normal/Avantage/Desavantage) */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Mode de jet
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMode('normal')}
            className={`px-2 py-2.5 rounded-xl transition text-sm font-semibold min-h-[44px] ${
              mode === 'normal'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => setMode('advantage')}
            className={`px-2 py-2.5 rounded-xl transition text-sm font-semibold min-h-[44px] ${
              mode === 'advantage'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
          >
            Avantage
          </button>
          <button
            onClick={() => setMode('disadvantage')}
            className={`px-2 py-2.5 rounded-xl transition text-sm font-semibold min-h-[44px] ${
              mode === 'disadvantage'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
          >
            Desavantage
          </button>
        </div>
        {mode !== 'normal' && (
          <p className="text-xs text-gray-500 mt-1">
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
          placeholder="Ex: Attaque a l'epee"
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-base focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded-xl text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Bouton Lancer */}
      <button
        onClick={handleRoll}
        className="w-full px-6 py-4 bg-indigo-600 active:bg-indigo-700 text-white font-bold rounded-xl transition text-lg min-h-[56px]"
      >
        Lancer les Des
      </button>

      {/* Ajouter un raccourci */}
      {showAddMacro ? (
        <div className="flex gap-2 items-center bg-gray-800 p-3 rounded-xl border border-gray-600">
          <input
            type="text"
            value={macroName}
            onChange={(e) => setMacroName(e.target.value)}
            placeholder="Nom du raccourci..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            onClick={() => {
              addFavorite(macroName || null);
              setShowAddMacro(false);
              setMacroName('');
            }}
            className="px-4 py-2 bg-indigo-600 active:bg-indigo-500 text-white rounded-lg text-sm font-semibold min-h-[40px]"
          >
            Sauver
          </button>
          <button
            onClick={() => { setShowAddMacro(false); setMacroName(''); }}
            className="px-4 py-2 bg-gray-700 active:bg-gray-600 text-white rounded-lg text-sm min-h-[40px]"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddMacro(true)}
          className="w-full px-4 py-2.5 bg-gray-800 active:bg-gray-700 text-gray-400 rounded-xl text-sm transition border border-gray-700 min-h-[44px]"
        >
          + Sauvegarder comme raccourci
        </button>
      )}

    </div>
  );
}
