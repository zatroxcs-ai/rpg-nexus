import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import api from '../services/api';
import useDataSync from '../hooks/useDataSync';

const RARITY_COLORS = {
  commun: 'border-gray-600 bg-gray-800',
  peu_commun: 'border-green-600 bg-green-900/30',
  rare: 'border-blue-600 bg-blue-900/30',
  tres_rare: 'border-purple-600 bg-purple-900/30',
  legendaire: 'border-amber-500 bg-amber-900/30',
  artefact: 'border-red-500 bg-red-900/30',
};

const RARITY_TEXT = {
  commun: 'text-gray-400',
  peu_commun: 'text-green-400',
  rare: 'text-blue-400',
  tres_rare: 'text-purple-400',
  legendaire: 'text-amber-400',
  artefact: 'text-red-400',
};

const CATEGORY_ICONS = {
  arme: '&#9876;',
  armure: '&#128737;',
  potion: '&#129514;',
  parchemin: '&#128220;',
  outil: '&#128295;',
  nourriture: '&#127830;',
  divers: '&#128188;',
};

export default function PlayerInventory({ gameId }) {
  const { user } = useAuth();
  const { gameState, rollDice } = useGame();
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [gameId, gameState?.characters]);

  const syncInventory = useCallback(() => { loadData(); }, [gameId]);
  useDataSync('item', syncInventory);

  const loadData = async () => {
    try {
      const charsRes = await api.get(`/character/game/${gameId}`);
      const myChars = (charsRes.data || []).filter(c => c.ownerId === user?.id);
      setCharacters(myChars);
      if (myChars.length > 0 && !selectedChar) {
        setSelectedChar(myChars[0]);
        await loadCharItems(myChars[0].id);
      } else if (selectedChar) {
        await loadCharItems(selectedChar.id);
      }
    } catch (e) {
      console.error('Error loading inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCharItems = async (charId) => {
    try {
      const res = await api.get(`/item/entity/character/${charId}`);
      setItems(res.data || []);
    } catch { setItems([]); }
  };

  const handleSelectChar = async (char) => {
    setSelectedChar(char);
    setSelectedItem(null);
    await loadCharItems(char.id);
  };

  const handleUseItem = async (itemId) => {
    try {
      await api.put(`/item/${itemId}/use`);
      if (selectedChar) await loadCharItems(selectedChar.id);
    } catch (e) {
      console.error('Error using item:', e);
    }
  };

  const charData = selectedChar?.data || {};
  const stats = charData.stats || charData.caracteristiques || {};
  const actions = charData.actions || charData.attaques || charData._actions || [];
  const hp = charData['HP'] ?? null;
  const hpMax = charData['HP Max'] ?? null;
  const hpPercent = hp !== null && hpMax ? Math.max(0, Math.min(100, Math.round((hp / hpMax) * 100))) : null;
  const hpColor = hpPercent !== null
    ? hpPercent > 60 ? 'bg-green-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-red-500'
    : '';
  const ca = charData['CA'] ?? null;
  const speed = charData['Vitesse'] ?? null;
  const backstory = charData._backstory || '';
  const DND_STATS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
  const dndStats = DND_STATS.filter(s => charData[s] !== undefined);
  const modifier = (val) => {
    if (!val && val !== 0) return '';
    const m = Math.floor((val - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>;
  }

  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">Aucun personnage</p>
          <p className="text-sm">Creez ou rejoignez un personnage dans l'onglet Personnages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {characters.length > 1 && (
        <div className="flex gap-2">
          {characters.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectChar(c)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                selectedChar?.id === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {selectedChar && (
        <>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-4">
            <div className="flex items-center gap-4">
              {selectedChar.avatar ? (
                <img
                  src={selectedChar.avatar.startsWith('http') ? selectedChar.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${selectedChar.avatar}`}
                  alt={selectedChar.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-900 flex items-center justify-center text-xl font-bold text-indigo-300 border-2 border-indigo-500 shrink-0">
                  {selectedChar.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{selectedChar.name}</h2>
                {charData.classe && (
                  <p className="text-indigo-400 text-sm">
                    {charData.race && `${charData.race} - `}{charData.classe}
                    {charData.niveau ? ` Niv.${charData.niveau}` : ''}
                    {charData._level ? ` Niv.${charData._level}` : ''}
                  </p>
                )}
              </div>
            </div>

            {hpPercent !== null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-400">PV</span>
                  <span className="text-xs font-bold text-white tabular-nums">{hp} / {hpMax}</span>
                </div>
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${hpColor}`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {ca !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 rounded-lg border border-gray-700">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm font-bold text-white">{ca}</span>
                  <span className="text-[10px] text-gray-500">CA</span>
                </div>
              )}
              {speed !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 rounded-lg border border-gray-700">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-bold text-white">{speed}</span>
                  <span className="text-[10px] text-gray-500">Vit.</span>
                </div>
              )}
              {charData._xp !== undefined && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 rounded-lg border border-gray-700">
                  <span className="text-sm font-bold text-amber-400">{charData._xp}</span>
                  <span className="text-[10px] text-gray-500">XP</span>
                </div>
              )}
            </div>

            {dndStats.length > 0 && (
              <div className="grid grid-cols-6 gap-1.5">
                {dndStats.map(stat => {
                  const val = charData[stat];
                  const mod = modifier(val);
                  return (
                    <div key={stat} className="bg-gray-900 rounded-lg p-1.5 text-center border border-gray-700">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">{stat}</div>
                      <div className="text-base font-bold text-white leading-tight">{val}</div>
                      {mod && <div className="text-[10px] text-indigo-400 font-medium">{mod}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {Object.keys(stats).length > 0 && dndStats.length === 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(stats).map(([key, val]) => (
                  <div key={key} className="bg-gray-900 rounded-lg p-2 text-center border border-gray-700">
                    <div className="text-[10px] text-gray-500 uppercase">{key.substring(0, 3)}</div>
                    <div className="text-lg font-bold text-white">{String(val)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {backstory && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-bold text-purple-400 mb-2">Histoire</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{backstory}</p>
            </div>
          )}

          {Array.isArray(actions) && actions.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-bold text-amber-400 mb-3">Actions rapides</h3>
              <div className="grid grid-cols-1 gap-2">
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const d = action.dice || action.de || action.damage;
                      if (d) {
                        const match = String(d).match(/(\d+)?d(\d+)([+-]\d+)?/i);
                        if (match) {
                          rollDice(parseInt(match[2]), parseInt(match[1] || '1'), parseInt(match[3] || '0'), action.name || action.nom || 'Action');
                        }
                      } else {
                        rollDice(20, 1, 0, action.name || action.nom || 'Action');
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3 bg-gray-700 active:bg-amber-800 rounded-xl transition text-left border border-gray-600 active:border-amber-600 min-h-[52px]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-900/50 border border-amber-700/50 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{action.name || action.nom || `Action ${idx + 1}`}</div>
                      {(action.dice || action.de || action.damage) && (
                        <div className="text-amber-400 text-xs font-medium">{action.dice || action.de || action.damage}</div>
                      )}
                      {action.description && <div className="text-gray-500 text-xs truncate">{action.description}</div>}
                    </div>
                    {action.successRate && (
                      <span className="text-xs text-gray-400 shrink-0">{action.successRate}%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-400">Inventaire ({items.length} objets)</h3>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">Aucun objet assigne a ce personnage.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map(item => {
                  const rarStyle = RARITY_COLORS[item.rarity] || RARITY_COLORS.commun;
                  const rarText = RARITY_TEXT[item.rarity] || RARITY_TEXT.commun;
                  const isSelected = selectedItem?.id === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setSelectedItem(isSelected ? null : item)}
                        className={`w-full text-left p-3 rounded-lg border transition ${rarStyle} ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:brightness-110'}`}
                      >
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img
                              src={item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${item.image}`}
                              alt={item.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-semibold text-sm truncate">{item.name}</div>
                            <div className={`text-xs ${rarText}`}>{item.rarity} - {item.category}</div>
                          </div>
                          {item.isConsumable && (
                            <span className="text-xs bg-emerald-800 text-emerald-300 px-1.5 py-0.5 rounded">Conso.</span>
                          )}
                          {item.isActive && (
                            <span className="text-xs bg-amber-800 text-amber-300 px-1.5 py-0.5 rounded">Actif</span>
                          )}
                        </div>
                      </button>

                      {isSelected && (
                        <div className="mt-1 p-3 bg-gray-900 rounded-lg border border-gray-700 space-y-2">
                          {item.description && <p className="text-gray-400 text-sm">{item.description}</p>}
                          {item.effects && Array.isArray(item.effects) && item.effects.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-500">Effets:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.effects.map((eff, i) => (
                                  <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                                    {typeof eff === 'string' ? eff : `${eff.type || ''} ${eff.value || ''}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.weight && <div className="text-xs text-gray-500">Poids: {item.weight}</div>}
                          {item.value && <div className="text-xs text-gray-500">Valeur: {item.value} po</div>}
                          {item.isConsumable && !item.isActive && (
                            <button
                              onClick={() => handleUseItem(item.id)}
                              className="w-full mt-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-sm font-semibold transition"
                            >
                              Utiliser
                            </button>
                          )}
                          {item.isActive && item.remainingTurns != null && (
                            <div className="text-xs text-amber-400">Tours restants: {item.remainingTurns}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
