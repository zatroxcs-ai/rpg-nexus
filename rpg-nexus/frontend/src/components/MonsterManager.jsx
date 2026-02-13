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

const toFullUrl = (url) => !url ? null : url.startsWith('http') ? url : 'http://localhost:3000' + url;

const emptyMonster = {
  name: '',
  image: '',
  description: '',
  type: '',
  size: '',
  challengeRating: '',
  showHp: true,
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
};

export default function MonsterManager({ gameId }) {
  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMonster, setEditingMonster] = useState(null);
  const [form, setForm] = useState({ ...emptyMonster });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [newAction, setNewAction] = useState({ name: '', description: '', damage: '', successRate: 50 });
  const [gameItems, setGameItems] = useState([]);
  const [entityItems, setEntityItems] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    visibility: false,
    combat: false,
    stats: false,
    actions: false,
    inventory: false,
  });

  useEffect(() => {
    loadMonsters();
    loadAssets();
    loadGameItems();
  }, [gameId]);

  const syncMonsters = useCallback(() => { loadMonsters(); }, [gameId]);
  useDataSync('monster', syncMonsters);

  useEffect(() => {
    if (monsters.length > 0) {
      loadAllEntityItems(monsters);
    }
  }, [monsters]);

  const loadMonsters = async () => {
    try {
      const res = await api.get('/monster/game/' + gameId);
      setMonsters(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load monsters:', e);
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

  const loadEntityItems = async (monsterId) => {
    try {
      const res = await api.get('/item/entity/monster/' + monsterId);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) { return []; }
  };

  const loadAllEntityItems = async (monsterList) => {
    const map = {};
    for (const m of monsterList) {
      map[m.id] = await loadEntityItems(m.id);
    }
    setEntityItems(map);
  };

  const handleAssignItem = async (itemId, monsterId) => {
    try {
      await api.put('/item/' + itemId + '/assign', { assignedToType: 'monster', assignedToId: monsterId });
      await loadGameItems();
      const items = await loadEntityItems(monsterId);
      setEntityItems(prev => ({ ...prev, [monsterId]: items }));
    } catch (e) {
      console.error('Failed to assign item:', e);
    }
  };

  const handleUnassignItem = async (itemId, monsterId) => {
    try {
      await api.put('/item/' + itemId + '/assign', { assignedToType: null, assignedToId: null });
      await loadGameItems();
      const items = await loadEntityItems(monsterId);
      setEntityItems(prev => ({ ...prev, [monsterId]: items }));
    } catch (e) {
      console.error('Failed to unassign item:', e);
    }
  };

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openCreate = () => {
    setForm({ ...emptyMonster, actions: [] });
    setEditingMonster(null);
    setNewAction({ name: '', description: '', damage: '', successRate: 50 });
    setShowImagePicker(false);
    setExpandedSections({ basic: true, visibility: false, combat: false, stats: false, actions: false, inventory: false });
    setShowForm(true);
  };

  const openEdit = (monster) => {
    setForm({
      name: monster.name || '',
      image: monster.image || '',
      description: monster.description || '',
      type: monster.type || '',
      size: monster.size || '',
      challengeRating: monster.challengeRating ?? '',
      showHp: monster.showHp !== undefined ? monster.showHp : true,
      showAc: monster.showAc !== undefined ? monster.showAc : false,
      showStats: monster.showStats !== undefined ? monster.showStats : false,
      showSpeed: monster.showSpeed !== undefined ? monster.showSpeed : false,
      showActions: monster.showActions !== undefined ? monster.showActions : false,
      hp: monster.hp ?? '',
      maxHp: monster.maxHp ?? '',
      ac: monster.ac ?? '',
      strength: monster.strength ?? '',
      dexterity: monster.dexterity ?? '',
      constitution: monster.constitution ?? '',
      intelligence: monster.intelligence ?? '',
      wisdom: monster.wisdom ?? '',
      charisma: monster.charisma ?? '',
      speed: monster.speed ?? '',
      actions: Array.isArray(monster.actions) ? [...monster.actions] : [],
    });
    setEditingMonster(monster);
    setNewAction({ name: '', description: '', damage: '', successRate: 50 });
    setShowImagePicker(false);
    setExpandedSections({ basic: true, visibility: true, combat: true, stats: true, actions: true, inventory: true });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      image: form.image || null,
      description: form.description || null,
      type: form.type || null,
      size: form.size || null,
      challengeRating: form.challengeRating !== '' ? parseFloat(form.challengeRating) : null,
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
    };

    try {
      if (editingMonster) {
        await api.put('/monster/' + editingMonster.id, payload);
      } else {
        await api.post('/monster/game/' + gameId, payload);
      }
      setShowForm(false);
      await loadMonsters();
    } catch (e) {
      console.error('Failed to save monster:', e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete('/monster/' + id);
      setDeleteConfirmId(null);
      await loadMonsters();
    } catch (e) {
      console.error('Failed to delete monster:', e);
    }
  };

  const addAction = () => {
    if (!newAction.name.trim()) return;
    setForm((prev) => ({
      ...prev,
      actions: [...prev.actions, { ...newAction }],
    }));
    setNewAction({ name: '', description: '', damage: '', successRate: 50 });
  };

  const removeAction = (index) => {
    setForm((prev) => ({ ...prev, actions: prev.actions.filter((_, i) => i !== index) }));
  };

  const filteredMonsters = monsters.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasStats = (monster) =>
    STAT_KEYS.some((k) => monster[k] !== null && monster[k] !== undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xl">
        Chargement des monstres...
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-xl">Gestionnaire de Monstres</h2>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition font-semibold"
          >
            + Nouveau Monstre
          </button>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un monstre par nom..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredMonsters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">{monsters.length === 0 ? 'Aucun monstre cree pour le moment.' : 'Aucun monstre ne correspond a votre recherche.'}</p>
            {monsters.length === 0 && (
              <p className="text-sm mt-2">Cliquez sur "+ Nouveau Monstre" pour commencer.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMonsters.map((monster) => {
              const pct = hpPercent(monster.hp, monster.maxHp);
              const bonuses = getItemBonuses(entityItems[monster.id]);
              return (
                <div
                  key={monster.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 transition overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {monster.image ? (
                        <img
                          src={toFullUrl(monster.image)}
                          alt={monster.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-gray-400 text-lg font-bold shrink-0">
                          {monster.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">{monster.name}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {monster.type && (
                            <span className="px-2 py-0.5 bg-purple-900 text-purple-300 text-xs rounded-full">
                              {monster.type}
                            </span>
                          )}
                          {monster.size && (
                            <span className="px-2 py-0.5 bg-emerald-900 text-emerald-300 text-xs rounded-full">
                              {monster.size}
                            </span>
                          )}
                          {monster.challengeRating != null && (
                            <span className="px-2 py-0.5 bg-amber-900 text-amber-300 text-xs rounded-full">
                              ID {monster.challengeRating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {monster.description && (
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{monster.description}</p>
                    )}

                    {monster.showHp && monster.maxHp != null && monster.maxHp > 0 && (() => {
                      const effHp = (monster.hp ?? 0) + (bonuses.hp || 0);
                      const effMaxHp = monster.maxHp + (bonuses.maxHp || 0);
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

                    {monster.showAc && monster.ac != null && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-400">CA</span>
                        <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-xs rounded font-semibold">
                          {monster.ac + (bonuses.ac || 0)}
                          {bonuses.ac ? <span className={`ml-1 text-[10px] ${bonuses.ac > 0 ? 'text-green-400' : 'text-red-400'}`}>({bonuses.ac > 0 ? '+' : ''}{bonuses.ac})</span> : null}
                        </span>
                      </div>
                    )}

                    {monster.showStats && hasStats(monster) && (
                      <div className="grid grid-cols-6 gap-1 mb-3">
                        {STAT_KEYS.map((stat) => {
                          const base = monster[stat];
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

                    {monster.showSpeed && monster.speed != null && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-400">Vitesse</span>
                        <span className="px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded font-semibold">
                          {monster.speed + (bonuses.speed || 0)} ft
                          {bonuses.speed ? <span className={`ml-1 text-[10px] ${bonuses.speed > 0 ? 'text-green-300' : 'text-red-400'}`}>({bonuses.speed > 0 ? '+' : ''}{bonuses.speed})</span> : null}
                        </span>
                      </div>
                    )}

                    {monster.showActions && Array.isArray(monster.actions) && monster.actions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs font-semibold mb-1">Actions</p>
                        <div className="space-y-1">
                          {monster.actions.map((action, i) => (
                            <div key={i} className="border-l-2 border-red-600 pl-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white text-xs font-semibold">{action.name}</span>
                                {action.successRate != null && (
                                  <span className="px-1 py-0.5 bg-cyan-900 text-cyan-300 text-[10px] rounded">{action.successRate}%</span>
                                )}
                                {action.damage && (
                                  <span className="px-1 py-0.5 bg-red-900 text-red-300 text-[10px] rounded">{action.damage}</span>
                                )}
                              </div>
                              {action.description && (
                                <p className="text-gray-500 text-[10px] line-clamp-1">{action.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {entityItems[monster.id] && entityItems[monster.id].length > 0 && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs font-semibold mb-1">Objets ({entityItems[monster.id].length})</p>
                        <div className="flex flex-wrap gap-1">
                          {entityItems[monster.id].map((item) => (
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
                  </div>

                  <div className="flex border-t border-gray-700">
                    <button
                      onClick={() => openEdit(monster)}
                      className="flex-1 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 transition"
                    >
                      Modifier
                    </button>
                    {deleteConfirmId === monster.id ? (
                      <div className="flex border-l border-gray-700">
                        <button
                          onClick={() => handleDelete(monster.id)}
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
                        onClick={() => setDeleteConfirmId(monster.id)}
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
                {editingMonster ? 'Modifier le monstre' : 'Creer un monstre'}
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
                  <span className="text-gray-400">{expandedSections.basic ? '\u2212' : '+'}</span>
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
                        placeholder="Nom du monstre"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Image</label>
                      {form.image ? (
                        <div className="relative inline-block">
                          <img
                            src={toFullUrl(form.image)}
                            alt="Apercu"
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-600"
                          />
                          <button
                            onClick={() => setForm((p) => ({ ...p, image: '' }))}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs leading-none"
                          >
                            x
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowImagePicker((p) => !p)}
                          className="w-full h-24 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition"
                        >
                          <span className="text-sm">Choisir depuis les fichiers</span>
                        </button>
                      )}
                      {showImagePicker && !form.image && assets.length > 0 && (
                        <div className="mt-2 grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                          {assets.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => { setForm((p) => ({ ...p, image: a.url })); setShowImagePicker(false); }}
                              className="aspect-square rounded-lg overflow-hidden border border-gray-600 hover:border-indigo-500 transition"
                            >
                              <img src={toFullUrl(a.url)} alt={a.filename} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      {showImagePicker && !form.image && assets.length === 0 && (
                        <p className="text-gray-500 text-xs mt-2">Aucun fichier image disponible.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none"
                        placeholder="Description du monstre..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Type</label>
                        <input
                          type="text"
                          value={form.type}
                          onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Ex: Mort-vivant, Dragon"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Taille</label>
                        <input
                          type="text"
                          value={form.size}
                          onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Ex: M, G, TG"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Indice de Dangerosite</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={form.challengeRating}
                          onChange={(e) => setForm((p) => ({ ...p, challengeRating: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Ex: 5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('visibility')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Visibilite des stats</span>
                  <span className="text-gray-400">{expandedSections.visibility ? '\u2212' : '+'}</span>
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
                      <button
                        key={key}
                        onClick={() => setForm((p) => ({ ...p, [key]: !p[key] }))}
                        className={`p-2 rounded-lg border text-xs font-semibold transition ${
                          form[key]
                            ? 'border-indigo-500 bg-indigo-900 bg-opacity-30 text-white'
                            : 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
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
                  <span className="text-gray-400">{expandedSections.combat ? '\u2212' : '+'}</span>
                </button>
                {expandedSections.combat && (
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    {form.showHp && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">PV</label>
                          <input
                            type="number"
                            value={form.hp}
                            onChange={(e) => setForm((p) => ({ ...p, hp: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">PV Max</label>
                          <input
                            type="number"
                            value={form.maxHp}
                            onChange={(e) => setForm((p) => ({ ...p, maxHp: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            placeholder="0"
                          />
                        </div>
                      </>
                    )}
                    {form.showAc && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">CA</label>
                        <input
                          type="number"
                          value={form.ac}
                          onChange={(e) => setForm((p) => ({ ...p, ac: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="10"
                        />
                      </div>
                    )}
                    {form.showSpeed && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Vitesse (ft)</label>
                        <input
                          type="number"
                          value={form.speed}
                          onChange={(e) => setForm((p) => ({ ...p, speed: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="30"
                        />
                      </div>
                    )}
                    {!form.showHp && !form.showAc && !form.showSpeed && (
                      <p className="text-gray-500 text-xs col-span-4">Activez au moins une stat de combat dans la section visibilite.</p>
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
                  <span className="text-gray-400">{expandedSections.stats ? '\u2212' : '+'}</span>
                </button>
                {expandedSections.stats && (
                  form.showStats ? (
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
                  ) : (
                    <p className="text-gray-500 text-xs mt-2">Activez "Stats" dans la section visibilite pour modifier les caracteristiques.</p>
                  )
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('actions')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Actions ({form.actions.length})</span>
                  <span className="text-gray-400">{expandedSections.actions ? '\u2212' : '+'}</span>
                </button>
                {expandedSections.actions && (
                  form.showActions ? (
                    <div className="mt-2">
                      {form.actions.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {form.actions.map((action, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-2 bg-gray-700 rounded-lg border border-gray-600"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white text-xs font-semibold">{action.name}</span>
                                  <span className="px-1 py-0.5 bg-cyan-900 text-cyan-300 text-[10px] rounded">{action.successRate ?? 50}%</span>
                                  {action.damage && (
                                    <span className="px-1 py-0.5 bg-red-900 text-red-300 text-[10px] rounded">{action.damage}</span>
                                  )}
                                </div>
                                {action.description && (
                                  <p className="text-gray-400 text-xs mt-1">{action.description}</p>
                                )}
                              </div>
                              <button
                                onClick={() => removeAction(i)}
                                className="text-red-400 hover:text-red-300 ml-1 leading-none"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newAction.name}
                          onChange={(e) => setNewAction((p) => ({ ...p, name: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addAction();
                            }
                          }}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Nom de l'action"
                        />
                        <input
                          type="text"
                          value={newAction.description}
                          onChange={(e) => setNewAction((p) => ({ ...p, description: e.target.value }))}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Description"
                        />
                        <input
                          type="text"
                          value={newAction.damage}
                          onChange={(e) => setNewAction((p) => ({ ...p, damage: e.target.value }))}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Degats (ex: 2d6+3)"
                        />
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newAction.successRate}
                          onChange={(e) => setNewAction((p) => ({ ...p, successRate: parseInt(e.target.value) || 50 }))}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="% reussite"
                        />
                      </div>
                      <button
                        onClick={addAction}
                        className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg border border-gray-600 transition"
                      >
                        Ajouter
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs mt-2">Activez "Actions" dans la section visibilite pour gerer les actions.</p>
                  )
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('inventory')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Objets ({editingMonster ? (entityItems[editingMonster.id] || []).length : 0})</span>
                  <span className="text-gray-400">{expandedSections.inventory ? '\u2212' : '+'}</span>
                </button>
                {expandedSections.inventory && (
                  <div className="mt-2">
                    {!editingMonster ? (
                      <p className="text-gray-500 text-xs">Sauvegardez d'abord le monstre pour pouvoir lui attribuer des objets.</p>
                    ) : (
                      <>
                        {(entityItems[editingMonster.id] || []).length > 0 && (
                          <div className="space-y-1 mb-3">
                            {(entityItems[editingMonster.id] || []).map((item) => (
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
                            const items = await loadEntityItems(editingMonster.id);
                            setEntityItems(prev => ({ ...prev, [editingMonster.id]: items }));
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
                            const items = await loadEntityItems(editingMonster.id);
                            setEntityItems(prev => ({ ...prev, [editingMonster.id]: items }));
                          }}
                          className="text-orange-400 hover:text-orange-300 text-xs px-2 py-1"
                        >
                          Utiliser
                        </button>
                      )
                    )}
                    <button
                      onClick={() => handleUnassignItem(item.id, editingMonster.id)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                    >
                      Retirer
                    </button>
                  </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {gameItems.filter(it => !it.assignedToId).length > 0 ? (
                          <div>
                            <p className="text-gray-400 text-xs mb-2">Ajouter un objet :</p>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {gameItems
                                .filter(it => !it.assignedToId)
                                .map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => handleAssignItem(item.id, editingMonster.id)}
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
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">Aucun objet disponible. Creez des objets dans l'onglet Objets.</p>
                        )}
                      </>
                    )}
                  </div>
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
                {editingMonster ? 'Sauvegarder' : 'Creer le monstre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
