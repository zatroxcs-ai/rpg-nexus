import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useDataSync from '../hooks/useDataSync';

const STAT_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const STAT_LABELS = { strength: 'FOR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'SAG', charisma: 'CHA' };

const modifier = (val) => {
  if (!val && val !== 0) return '';
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

const hpPercent = (hp, maxHp) => {
  if (!maxHp || maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, (hp / maxHp) * 100));
};

const hpColor = (pct) => {
  if (pct <= 25) return 'bg-red-500';
  if (pct <= 50) return 'bg-orange-500';
  if (pct <= 75) return 'bg-yellow-500';
  return 'bg-green-500';
};

const EFFECT_STAT_MAP = {
  'FOR': 'strength', 'DEX': 'dexterity', 'CON': 'constitution',
  'INT': 'intelligence', 'SAG': 'wisdom', 'CHA': 'charisma',
  'HP': 'hp', 'HP Max': 'maxHp', 'CA': 'ac', 'Vitesse': 'speed',
};

const getItemBonuses = (items) => {
  const bonuses = {};
  if (!Array.isArray(items)) return bonuses;
  for (const item of items) {
    if (!Array.isArray(item.effects)) continue;
    if (item.isConsumable && !item.isActive) continue;
    for (const effect of item.effects) {
      const key = EFFECT_STAT_MAP[effect.stat] || effect.stat;
      bonuses[key] = (bonuses[key] || 0) + (effect.modifier || 0);
    }
  }
  return bonuses;
};

const emptyNpc = {
  name: '',
  avatar: '',
  description: '',
  role: '',
  location: '',
  isVisible: true,
  showHp: false,
  showAc: false,
  showStats: false,
  showSpeed: false,
  showActions: false,
  hp: '',
  maxHp: '',
  ac: '',
  strength: '',
  dexterity: '',
  constitution: '',
  intelligence: '',
  wisdom: '',
  charisma: '',
  speed: '',
  actions: [],
  notes: '',
};

export default function NpcManager({ gameId }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingNpc, setEditingNpc] = useState(null);
  const [form, setForm] = useState({ ...emptyNpc });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    visibility: false,
    combat: false,
    stats: false,
    actions: false,
    inventory: false,
    notes: false,
  });
  const [assets, setAssets] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [gameItems, setGameItems] = useState([]);
  const [entityItems, setEntityItems] = useState({});

  useEffect(() => {
    loadNpcs();
    loadAssets();
    loadGameItems();
  }, [gameId]);

  const syncNpcs = useCallback(() => { loadNpcs(); }, [gameId]);
  useDataSync('npc', syncNpcs);

  useEffect(() => {
    if (npcs.length > 0) {
      loadAllEntityItems(npcs);
    }
  }, [npcs]);

  const loadNpcs = async () => {
    try {
      const res = await api.get('/npc/game/' + gameId);
      setNpcs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load NPCs:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const res = await api.get('/asset/game/' + gameId);
      setAssets((res.data || []).filter(a => {
        const url = a.url || '';
        return (a.type || '').startsWith('image') || url.match(/\.(png|jpg|jpeg|gif|webp)$/i);
      }));
    } catch (e) {}
  };

  const loadGameItems = async () => {
    try {
      const res = await api.get('/item/game/' + gameId);
      setGameItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  };

  const loadEntityItems = async (npcId) => {
    try {
      const res = await api.get('/item/entity/npc/' + npcId);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) { return []; }
  };

  const loadAllEntityItems = async (npcList) => {
    const map = {};
    for (const npc of npcList) {
      map[npc.id] = await loadEntityItems(npc.id);
    }
    setEntityItems(map);
  };

  const handleAssignItem = async (itemId, npcId) => {
    try {
      await api.put('/item/' + itemId + '/assign', { assignedToType: 'npc', assignedToId: npcId });
      await loadGameItems();
      const items = await loadEntityItems(npcId);
      setEntityItems(prev => ({ ...prev, [npcId]: items }));
    } catch (e) {
      console.error('Failed to assign item:', e);
    }
  };

  const handleUnassignItem = async (itemId, npcId) => {
    try {
      await api.put('/item/' + itemId + '/assign', { assignedToType: null, assignedToId: null });
      await loadGameItems();
      const items = await loadEntityItems(npcId);
      setEntityItems(prev => ({ ...prev, [npcId]: items }));
    } catch (e) {
      console.error('Failed to unassign item:', e);
    }
  };

  const toFullUrl = (url) => !url ? null : url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openCreate = () => {
    setForm({ ...emptyNpc });
    setEditingNpc(null);
    setExpandedSections({ basic: true, visibility: false, combat: false, stats: false, actions: false, inventory: false, notes: false });
    setShowForm(true);
  };

  const openEdit = (npc) => {
    setForm({
      name: npc.name || '',
      avatar: npc.avatar || '',
      description: npc.description || '',
      role: npc.role || '',
      location: npc.location || '',
      isVisible: npc.isVisible !== undefined ? npc.isVisible : true,
      showHp: npc.showHp ?? false,
      showAc: npc.showAc ?? false,
      showStats: npc.showStats ?? false,
      showSpeed: npc.showSpeed ?? false,
      showActions: npc.showActions ?? false,
      hp: npc.hp ?? '',
      maxHp: npc.maxHp ?? '',
      ac: npc.ac ?? '',
      strength: npc.strength ?? '',
      dexterity: npc.dexterity ?? '',
      constitution: npc.constitution ?? '',
      intelligence: npc.intelligence ?? '',
      wisdom: npc.wisdom ?? '',
      charisma: npc.charisma ?? '',
      speed: npc.speed ?? '',
      actions: Array.isArray(npc.actions) ? [...npc.actions] : [],
      notes: npc.notes || '',
    });
    setEditingNpc(npc);
    setExpandedSections({ basic: true, visibility: true, combat: true, stats: true, actions: true, inventory: true, notes: true });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      avatar: form.avatar || null,
      description: form.description || null,
      role: form.role || null,
      location: form.location || null,
      isVisible: form.isVisible,
      showHp: form.showHp,
      showAc: form.showAc,
      showStats: form.showStats,
      showSpeed: form.showSpeed,
      showActions: form.showActions,
      hp: form.hp !== '' ? parseInt(form.hp) : null,
      maxHp: form.maxHp !== '' ? parseInt(form.maxHp) : null,
      ac: form.ac !== '' ? parseInt(form.ac) : null,
      strength: form.strength !== '' ? parseInt(form.strength) : null,
      dexterity: form.dexterity !== '' ? parseInt(form.dexterity) : null,
      constitution: form.constitution !== '' ? parseInt(form.constitution) : null,
      intelligence: form.intelligence !== '' ? parseInt(form.intelligence) : null,
      wisdom: form.wisdom !== '' ? parseInt(form.wisdom) : null,
      charisma: form.charisma !== '' ? parseInt(form.charisma) : null,
      speed: form.speed !== '' ? parseInt(form.speed) : null,
      actions: form.actions,
      notes: form.notes || null,
    };

    try {
      if (editingNpc) {
        await api.put('/npc/' + editingNpc.id, payload);
      } else {
        await api.post('/npc/game/' + gameId, payload);
      }
      setShowForm(false);
      await loadNpcs();
    } catch (e) {
      console.error('Failed to save NPC:', e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete('/npc/' + id);
      setDeleteConfirmId(null);
      await loadNpcs();
    } catch (e) {
      console.error('Failed to delete NPC:', e);
    }
  };

  const toggleVisibility = async (npc) => {
    try {
      await api.put('/npc/' + npc.id, { isVisible: !npc.isVisible });
      await loadNpcs();
    } catch (e) {
      console.error('Failed to toggle visibility:', e);
    }
  };

  const [newAction, setNewAction] = useState({ name: '', description: '', damage: '', successRate: 50 });

  const addAction = () => {
    if (!newAction.name.trim()) return;
    setForm(prev => ({ ...prev, actions: [...prev.actions, { id: Date.now().toString(), ...newAction }] }));
    setNewAction({ name: '', description: '', damage: '', successRate: 50 });
  };

  const removeAction = (idx) => {
    setForm(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== idx) }));
  };

  const filteredNpcs = npcs.filter((npc) =>
    npc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasStats = (npc) => STAT_KEYS.some((k) => npc[k] !== null && npc[k] !== undefined);
  const hasActions = (npc) => Array.isArray(npc.actions) && npc.actions.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xl">
        Chargement des PNJ...
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-xl">Gestionnaire de PNJ</h2>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition font-semibold"
          >
            + Nouveau PNJ
          </button>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un PNJ..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredNpcs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">{npcs.length === 0 ? 'Aucun PNJ cree.' : 'Aucun PNJ ne correspond.'}</p>
            {npcs.length === 0 && (
              <p className="text-sm mt-2">Cliquez sur "+ Nouveau PNJ" pour commencer.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNpcs.map((npc) => {
              const pct = hpPercent(npc.hp, npc.maxHp);
              const bonuses = getItemBonuses(entityItems[npc.id]);
              return (
                <div
                  key={npc.id}
                  className={`bg-gray-800 rounded-xl border transition overflow-hidden ${
                    !npc.isVisible ? 'border-gray-600 opacity-75' : 'border-gray-700'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {npc.avatar ? (
                        <img
                          src={toFullUrl(npc.avatar)}
                          alt={npc.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-gray-400 text-lg font-bold shrink-0">
                          {npc.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold text-sm truncate">{npc.name}</h3>
                          {!npc.isVisible && (
                            <span className="px-1.5 py-0.5 bg-yellow-900 text-yellow-300 text-xs rounded font-medium shrink-0">
                              masque
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {npc.role && (
                            <span className="px-2 py-0.5 bg-purple-900 text-purple-300 text-xs rounded-full">
                              {npc.role}
                            </span>
                          )}
                          {npc.location && (
                            <span className="px-2 py-0.5 bg-emerald-900 text-emerald-300 text-xs rounded-full">
                              {npc.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {npc.description && (
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{npc.description}</p>
                    )}

                    {npc.showHp && npc.maxHp != null && npc.maxHp > 0 && (() => {
                      const effHp = (npc.hp ?? 0) + (bonuses.hp || 0);
                      const effMaxHp = npc.maxHp + (bonuses.maxHp || 0);
                      const effPct = hpPercent(effHp, effMaxHp);
                      return (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>PV</span>
                            <span>
                              {effHp} / {effMaxHp}
                              {(bonuses.hp || bonuses.maxHp) ? (
                                <span className="text-cyan-400 ml-1 text-[10px]">
                                  ({bonuses.hp ? `${bonuses.hp > 0 ? '+' : ''}${bonuses.hp}` : ''}{bonuses.hp && bonuses.maxHp ? '/' : ''}{bonuses.maxHp ? `${bonuses.maxHp > 0 ? '+' : ''}${bonuses.maxHp}` : ''})
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${hpColor(effPct)}`}
                              style={{ width: `${effPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {npc.showAc && npc.ac != null && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-400">CA</span>
                        <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-xs rounded font-semibold">
                          {npc.ac + (bonuses.ac || 0)}
                          {bonuses.ac ? <span className={`ml-1 text-[10px] ${bonuses.ac > 0 ? 'text-green-400' : 'text-red-400'}`}>({bonuses.ac > 0 ? '+' : ''}{bonuses.ac})</span> : null}
                        </span>
                      </div>
                    )}

                    {npc.showStats && hasStats(npc) && (
                      <div className="grid grid-cols-6 gap-1 mb-3">
                        {STAT_KEYS.map((stat) => {
                          const base = npc[stat];
                          const bonus = bonuses[stat] || 0;
                          const effective = base != null ? base + bonus : null;
                          return (
                            <div key={stat} className={`text-center rounded p-1 ${bonus !== 0 ? (bonus > 0 ? 'bg-green-900 bg-opacity-40' : 'bg-red-900 bg-opacity-40') : 'bg-gray-700'}`}>
                              <p className="text-gray-400 text-[10px] font-bold">{STAT_LABELS[stat]}</p>
                              <p className="text-white text-xs font-semibold">{effective ?? '-'}</p>
                              {effective != null && (
                                <p className="text-gray-500 text-[10px]">{modifier(effective)}</p>
                              )}
                              {bonus !== 0 && (
                                <p className={`text-[9px] ${bonus > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {bonus > 0 ? '+' : ''}{bonus}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {npc.showSpeed && npc.speed != null && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-400">Vitesse</span>
                        <span className="px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded font-semibold">
                          {npc.speed + (bonuses.speed || 0)} ft
                          {bonuses.speed ? <span className={`ml-1 text-[10px] ${bonuses.speed > 0 ? 'text-green-300' : 'text-red-400'}`}>({bonuses.speed > 0 ? '+' : ''}{bonuses.speed})</span> : null}
                        </span>
                      </div>
                    )}

                    {npc.showActions && hasActions(npc) && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs font-semibold mb-1">Actions</p>
                        <div className="space-y-1">
                          {npc.actions.slice(0, 3).map((action, i) => (
                            <div key={i} className="flex items-center gap-1 border-l-2 border-orange-600 pl-2">
                              <span className="text-white text-xs font-semibold">{action.name}</span>
                              {action.successRate && <span className="text-[10px] text-cyan-400">{action.successRate}%</span>}
                              {action.damage && <span className="text-[10px] text-orange-400">{action.damage}</span>}
                            </div>
                          ))}
                          {npc.actions.length > 3 && <p className="text-gray-500 text-[10px] pl-2">+{npc.actions.length - 3} autres...</p>}
                        </div>
                      </div>
                    )}

                    {entityItems[npc.id] && entityItems[npc.id].length > 0 && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs font-semibold mb-1">Objets ({entityItems[npc.id].length})</p>
                        <div className="flex flex-wrap gap-1">
                          {entityItems[npc.id].map((item) => (
                            <span
                              key={item.id}
                              className="px-1.5 py-0.5 bg-amber-900 text-amber-300 text-xs rounded"
                            >
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {npc.notes && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs font-semibold mb-1">Notes</p>
                        <p className="text-gray-400 text-xs line-clamp-2 italic">{npc.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex border-t border-gray-700">
                    <button
                      onClick={() => toggleVisibility(npc)}
                      className="flex-1 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition"
                      title={npc.isVisible ? 'Masquer aux joueurs' : 'Montrer aux joueurs'}
                    >
                      {npc.isVisible ? 'Masquer' : 'Montrer'}
                    </button>
                    <button
                      onClick={() => openEdit(npc)}
                      className="flex-1 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 transition border-l border-gray-700"
                    >
                      Modifier
                    </button>
                    {deleteConfirmId === npc.id ? (
                      <div className="flex border-l border-gray-700">
                        <button
                          onClick={() => handleDelete(npc.id)}
                          className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-30 transition font-semibold"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(npc.id)}
                        className="flex-1 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-gray-700 transition border-l border-gray-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-white">
                {editingNpc ? 'Modifier le PNJ' : 'Creer un PNJ'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                x
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <button
                  onClick={() => toggleSection('basic')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Informations de base</span>
                  <span className="text-gray-400">{expandedSections.basic ? '−' : '+'}</span>
                </button>
                {expandedSections.basic && (
                  <div className="space-y-3 mt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Nom *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Nom du PNJ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Avatar</label>
                      {form.avatar ? (
                        <div className="relative inline-block">
                          <img src={toFullUrl(form.avatar)} alt="Apercu" className="w-20 h-20 rounded-full object-cover border-2 border-gray-600" />
                          <button onClick={() => setForm(p => ({ ...p, avatar: '' }))}
                            className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowImagePicker(!showImagePicker)}
                          className="w-full h-20 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition">
                          <span className="text-2xl">{'\uD83D\uDDBC\uFE0F'}</span>
                          <span className="text-xs mt-1">Choisir une image</span>
                        </button>
                      )}
                      {showImagePicker && !form.avatar && assets.length > 0 && (
                        <div className="mt-2 grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                          {assets.map(a => (
                            <button key={a.id} onClick={() => { setForm(p => ({ ...p, avatar: a.url })); setShowImagePicker(false); }}
                              className="aspect-square rounded-lg overflow-hidden border border-gray-600 hover:border-indigo-500 transition">
                              <img src={toFullUrl(a.url)} alt={a.name || a.filename} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      {showImagePicker && assets.length === 0 && (
                        <p className="text-xs text-gray-500 mt-2">Aucune image disponible. Uploadez des fichiers dans l'onglet Fichiers.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none"
                        placeholder="Description du PNJ..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Role</label>
                        <input
                          type="text"
                          value={form.role}
                          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Ex: Marchand, Garde, Donneur de quete"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Lieu</label>
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Ex: Taverne, Porte du chateau"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-gray-300">Visible par les joueurs</label>
                      <button
                        onClick={() => setForm((p) => ({ ...p, isVisible: !p.isVisible }))}
                        className={`relative w-10 h-5 rounded-full transition ${
                          form.isVisible ? 'bg-indigo-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            form.isVisible ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button onClick={() => toggleSection('visibility')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2">
                  <span>Visibilite des stats</span>
                  <span className="text-gray-400">{expandedSections.visibility ? '−' : '+'}</span>
                </button>
                {expandedSections.visibility && (
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {[
                      { key: 'showHp', label: 'PV' },
                      { key: 'showAc', label: 'CA' },
                      { key: 'showStats', label: 'Stats' },
                      { key: 'showSpeed', label: 'Vitesse' },
                      { key: 'showActions', label: 'Actions' },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                        className={`p-2 rounded-lg border text-xs font-semibold transition ${
                          form[key] ? 'border-indigo-500 bg-indigo-900 bg-opacity-30 text-white' : 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('combat')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Stats de combat</span>
                  <span className="text-gray-400">{expandedSections.combat ? '−' : '+'}</span>
                </button>
                {expandedSections.combat && (
                  <div className="space-y-3 mt-2">
                    {form.showHp && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">PV</label>
                          <input type="number" value={form.hp} onChange={(e) => setForm((p) => ({ ...p, hp: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">PV Max</label>
                          <input type="number" value={form.maxHp} onChange={(e) => setForm((p) => ({ ...p, maxHp: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="0" />
                        </div>
                      </div>
                    )}
                    {form.showAc && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">CA</label>
                        <input type="number" value={form.ac} onChange={(e) => setForm((p) => ({ ...p, ac: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="10" />
                      </div>
                    )}
                    {form.showSpeed && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Vitesse (ft)</label>
                        <input type="number" value={form.speed} onChange={(e) => setForm((p) => ({ ...p, speed: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="30" />
                      </div>
                    )}
                    {!form.showHp && !form.showAc && !form.showSpeed && (
                      <p className="text-gray-500 text-xs">Activez des stats dans "Visibilite" pour les configurer ici.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('stats')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Caracteristiques</span>
                  <span className="text-gray-400">{expandedSections.stats ? '−' : '+'}</span>
                </button>
                {expandedSections.stats && (
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {STAT_KEYS.map((stat) => (
                      <div key={stat}>
                        <label className="block text-[10px] font-bold text-indigo-400 mb-1 text-center">
                          {STAT_LABELS[stat]}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={form[stat]}
                          onChange={(e) => setForm((p) => ({ ...p, [stat]: e.target.value }))}
                          className="w-full px-1 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-indigo-500"
                          placeholder="10"
                        />
                        {form[stat] !== '' && (
                          <p className="text-center text-[10px] text-gray-400 mt-1">
                            {modifier(parseInt(form[stat]))}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button onClick={() => toggleSection('actions')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2">
                  <span>Actions ({form.actions.length})</span>
                  <span className="text-gray-400">{expandedSections.actions ? '−' : '+'}</span>
                </button>
                {expandedSections.actions && (
                  <div className="mt-2">
                    {form.actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2 p-2 bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold text-sm">{action.name}</p>
                            <span className="text-xs text-cyan-400 bg-cyan-900 bg-opacity-40 px-1 rounded">{action.successRate ?? 50}%</span>
                            {action.damage && <span className="text-xs text-orange-400 bg-orange-900 bg-opacity-40 px-1 rounded">{action.damage}</span>}
                          </div>
                          {action.description && <p className="text-gray-400 text-xs mt-1">{action.description}</p>}
                        </div>
                        <button onClick={() => removeAction(i)} className="text-red-400 hover:text-red-300 text-lg leading-none">x</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <input type="text" value={newAction.name} onChange={e => setNewAction(p => ({ ...p, name: e.target.value }))}
                        placeholder="Nom" className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                      <input type="number" min="1" max="100" value={newAction.successRate} onChange={e => setNewAction(p => ({ ...p, successRate: parseInt(e.target.value) || 50 }))}
                        placeholder="%" className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                      <input type="text" value={newAction.damage} onChange={e => setNewAction(p => ({ ...p, damage: e.target.value }))}
                        placeholder="Degats (2d6+3)" className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                      <input type="text" value={newAction.description} onChange={e => setNewAction(p => ({ ...p, description: e.target.value }))}
                        placeholder="Description" className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                    </div>
                    <button onClick={addAction} className="mt-2 w-full px-4 py-1 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg transition">
                      + Ajouter une action
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('inventory')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Objets ({editingNpc ? (entityItems[editingNpc.id] || []).length : 0})</span>
                  <span className="text-gray-400">{expandedSections.inventory ? '−' : '+'}</span>
                </button>
                {expandedSections.inventory && (
                  <div className="mt-2">
                    {!editingNpc ? (
                      <p className="text-gray-500 text-xs">Sauvegardez d'abord le PNJ pour pouvoir lui attribuer des objets.</p>
                    ) : (
                      <>
                        {(entityItems[editingNpc.id] || []).length > 0 && (
                          <div className="space-y-1 mb-3">
                            {(entityItems[editingNpc.id] || []).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 bg-gray-700 rounded-lg border border-gray-600"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm font-semibold">{item.name}</span>
                                  {item.rarity && item.rarity !== 'commun' && (
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                                      item.rarity === 'legendaire' ? 'bg-amber-900 text-amber-300' :
                                      item.rarity === 'tres rare' ? 'bg-purple-900 text-purple-300' :
                                      item.rarity === 'rare' ? 'bg-blue-900 text-blue-300' :
                                      'bg-green-900 text-green-300'
                                    }`}>{item.rarity}</span>
                                  )}
                                  {Array.isArray(item.effects) && item.effects.length > 0 && (
                                    <span className="text-[10px] text-cyan-400">
                                      {item.effects.map(e => `${e.modifier > 0 ? '+' : ''}${e.modifier} ${e.stat}`).join(', ')}
                                    </span>
                                  )}
                                  {item.isConsumable && (
                                    <span className={`text-[10px] px-1 rounded ${item.isActive ? 'bg-cyan-900 text-cyan-300' : 'bg-orange-900 text-orange-400'}`}>
                                      {item.isActive ? `Actif (${item.remainingTurns ?? 0}t)` : 'Conso.'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {item.isConsumable && (
                                    item.isActive ? (
                                      <button
                                        onClick={async () => {
                                          await api.put('/item/' + item.id + '/deactivate');
                                          await loadGameItems();
                                          const items = await loadEntityItems(editingNpc.id);
                                          setEntityItems(prev => ({ ...prev, [editingNpc.id]: items }));
                                        }}
                                        className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1"
                                      >
                                        Desactiver
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          await api.put('/item/' + item.id + '/use');
                                          await loadGameItems();
                                          const items = await loadEntityItems(editingNpc.id);
                                          setEntityItems(prev => ({ ...prev, [editingNpc.id]: items }));
                                        }}
                                        className="text-orange-400 hover:text-orange-300 text-xs px-2 py-1"
                                      >
                                        Utiliser
                                      </button>
                                    )
                                  )}
                                  <button
                                    onClick={() => handleUnassignItem(item.id, editingNpc.id)}
                                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {gameItems.filter(it => !it.assignedToId || it.assignedToId === editingNpc.id).length > 0 ? (
                          <div>
                            <p className="text-gray-400 text-xs mb-2">Ajouter un objet :</p>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {gameItems
                                .filter(it => !it.assignedToId)
                                .map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => handleAssignItem(item.id, editingNpc.id)}
                                    className="w-full flex items-center justify-between p-2 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-white text-sm">{item.name}</span>
                                      {item.rarity && item.rarity !== 'commun' && (
                                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                                          item.rarity === 'legendaire' ? 'bg-amber-900 text-amber-300' :
                                          item.rarity === 'tres rare' ? 'bg-purple-900 text-purple-300' :
                                          item.rarity === 'rare' ? 'bg-blue-900 text-blue-300' :
                                          'bg-green-900 text-green-300'
                                        }`}>{item.rarity}</span>
                                      )}
                                    </div>
                                    <span className="text-emerald-400 text-xs">+ Donner</span>
                                  </button>
                                ))}
                            </div>
                            {gameItems.filter(it => !it.assignedToId).length === 0 && (
                              <p className="text-gray-500 text-xs mt-2">Tous les objets sont deja assignes.</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">Aucun objet disponible. Creez des objets dans l'onglet Objets.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('notes')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Notes du MJ</span>
                  <span className="text-gray-400">{expandedSections.notes ? '−' : '+'}</span>
                </button>
                {expandedSections.notes && (
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 h-28 resize-none mt-2"
                    placeholder="Notes privees du MJ sur ce PNJ..."
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-700 shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition font-semibold text-sm"
              >
                {editingNpc ? 'Sauvegarder' : 'Creer le PNJ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
