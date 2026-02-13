import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useDataSync from '../hooks/useDataSync';

const RARITIES = ['commun', 'peu commun', 'rare', 'tres rare', 'legendaire'];
const CATEGORIES = ['arme', 'armure', 'potion', 'parchemin', 'outil', 'tresor', 'divers'];
const STAT_OPTIONS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA', 'HP', 'CA', 'Vitesse'];

const RARITY_COLORS = {
  commun: { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-500' },
  'peu commun': { bg: 'bg-green-900', text: 'text-green-300', border: 'border-green-500' },
  rare: { bg: 'bg-blue-900', text: 'text-blue-300', border: 'border-blue-500' },
  'tres rare': { bg: 'bg-purple-900', text: 'text-purple-300', border: 'border-purple-500' },
  legendaire: { bg: 'bg-amber-900', text: 'text-amber-300', border: 'border-amber-500' },
};

const CATEGORY_ICONS = {
  arme: '\u2694\uFE0F',
  armure: '\uD83D\uDEE1\uFE0F',
  potion: '\uD83E\uDDEA',
  parchemin: '\uD83D\uDCDC',
  outil: '\uD83D\uDD27',
  tresor: '\uD83D\uDC8E',
  divers: '\uD83D\uDCE6',
};

const toFullUrl = (url) => !url ? null : url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;

const emptyItem = {
  name: '',
  description: '',
  image: '',
  rarity: 'commun',
  category: 'divers',
  weight: '',
  value: '',
  effects: [],
  isConsumable: false,
  duration: '',
};

export default function ItemManager({ gameId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...emptyItem });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [assignDropdownId, setAssignDropdownId] = useState(null);
  const [newEffect, setNewEffect] = useState({ stat: 'FOR', modifier: 0 });
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    properties: false,
    effects: false,
  });

  useEffect(() => {
    loadItems();
    loadAssets();
    loadCharacters();
    loadMonsters();
    loadNpcs();
  }, [gameId]);

  const syncItems = useCallback(() => { loadItems(); }, [gameId]);
  useDataSync('item', syncItems);

  const loadItems = async () => {
    try {
      const res = await api.get('/item/game/' + gameId);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load items:', e);
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

  const loadCharacters = async () => {
    try {
      const res = await api.get('/character/game/' + gameId);
      setCharacters(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  };

  const loadMonsters = async () => {
    try {
      const res = await api.get('/monster/game/' + gameId);
      setMonsters(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  };

  const loadNpcs = async () => {
    try {
      const res = await api.get('/npc/game/' + gameId);
      setNpcs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  };

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getEntityName = (item) => {
    if (!item.assignedToType || !item.assignedToId) return null;
    let list = [];
    if (item.assignedToType === 'character') list = characters;
    else if (item.assignedToType === 'monster') list = monsters;
    else if (item.assignedToType === 'npc') list = npcs;
    const entity = list.find(e => e.id === item.assignedToId);
    return entity ? entity.name : null;
  };

  const getAssignBadgeColor = (type) => {
    if (type === 'character') return 'bg-blue-900 text-blue-300';
    if (type === 'monster') return 'bg-red-900 text-red-300';
    if (type === 'npc') return 'bg-emerald-900 text-emerald-300';
    return 'bg-gray-700 text-gray-300';
  };

  const getAssignLabel = (type) => {
    if (type === 'character') return 'Personnage';
    if (type === 'monster') return 'Monstre';
    if (type === 'npc') return 'PNJ';
    return '';
  };

  const openCreate = () => {
    setForm({ ...emptyItem, effects: [] });
    setEditingItem(null);
    setNewEffect({ stat: 'FOR', modifier: 0 });
    setShowImagePicker(false);
    setExpandedSections({ basic: true, properties: false, effects: false });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name || '',
      description: item.description || '',
      image: item.image || '',
      rarity: item.rarity || 'commun',
      category: item.category || 'divers',
      weight: item.weight ?? '',
      value: item.value ?? '',
      effects: Array.isArray(item.effects) ? [...item.effects] : [],
      isConsumable: item.isConsumable || false,
      duration: item.duration ?? '',
    });
    setEditingItem(item);
    setNewEffect({ stat: 'FOR', modifier: 0 });
    setShowImagePicker(false);
    setExpandedSections({ basic: true, properties: true, effects: true });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      image: form.image || null,
      rarity: form.rarity,
      category: form.category,
      weight: form.weight !== '' ? parseFloat(form.weight) : null,
      value: form.value !== '' ? parseInt(form.value) : null,
      effects: form.effects,
      isConsumable: form.isConsumable,
      duration: form.duration !== '' ? parseInt(form.duration) : null,
    };

    try {
      if (editingItem) {
        await api.put('/item/' + editingItem.id, payload);
      } else {
        await api.post('/item/game/' + gameId, payload);
      }
      setShowForm(false);
      await loadItems();
    } catch (e) {
      console.error('Failed to save item:', e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete('/item/' + id);
      setDeleteConfirmId(null);
      await loadItems();
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  const handleAssign = async (itemId, assignedToType, assignedToId) => {
    try {
      await api.put('/item/' + itemId + '/assign', { assignedToType, assignedToId });
      setAssignDropdownId(null);
      await loadItems();
    } catch (e) {
      console.error('Failed to assign item:', e);
    }
  };

  const handleUnassign = async (itemId) => {
    try {
      await api.put('/item/' + itemId + '/assign', { assignedToType: null, assignedToId: null });
      await loadItems();
    } catch (e) {
      console.error('Failed to unassign item:', e);
    }
  };

  const handleUseItem = async (itemId) => {
    try {
      await api.put('/item/' + itemId + '/use');
      await loadItems();
    } catch (e) {
      console.error('Failed to use item:', e);
    }
  };

  const handleDeactivateItem = async (itemId) => {
    try {
      await api.put('/item/' + itemId + '/deactivate');
      await loadItems();
    } catch (e) {
      console.error('Failed to deactivate item:', e);
    }
  };

  const handleTickAll = async () => {
    try {
      await api.put('/item/game/' + gameId + '/tick-all');
      await loadItems();
    } catch (e) {
      console.error('Failed to tick items:', e);
    }
  };

  const addEffect = () => {
    if (!newEffect.stat || newEffect.modifier === '' || newEffect.modifier === undefined) return;
    setForm((prev) => ({
      ...prev,
      effects: [...prev.effects, { stat: newEffect.stat, modifier: parseInt(newEffect.modifier) }],
    }));
    setNewEffect({ stat: 'FOR', modifier: 0 });
  };

  const removeEffect = (index) => {
    setForm((prev) => ({ ...prev, effects: prev.effects.filter((_, i) => i !== index) }));
  };

  const formatModifier = (val) => {
    const n = parseInt(val);
    if (isNaN(n)) return '+0';
    return n >= 0 ? '+' + n : '' + n;
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesRarity = !filterRarity || item.rarity === filterRarity;
    return matchesSearch && matchesCategory && matchesRarity;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xl">
        Chargement des objets...
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-xl">Gestionnaire d'Objets</h2>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition font-semibold"
          >
            + Nouvel Objet
          </button>
          <button
            onClick={handleTickAll}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition font-semibold"
            title="Decompte 1 tour sur tous les consommables actifs"
          >
            -1 Tour
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un objet..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Toutes categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Toutes raretes</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">{items.length === 0 ? 'Aucun objet cree pour le moment.' : 'Aucun objet ne correspond a votre recherche.'}</p>
            {items.length === 0 && (
              <p className="text-sm mt-2">Cliquez sur "+ Nouvel Objet" pour commencer.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const rarityStyle = RARITY_COLORS[item.rarity] || RARITY_COLORS.commun;
              const entityName = getEntityName(item);
              const effects = Array.isArray(item.effects) ? item.effects : [];
              return (
                <div
                  key={item.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 transition overflow-hidden relative"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {item.image ? (
                        <img
                          src={toFullUrl(item.image)}
                          alt={item.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-gray-400 text-lg font-bold shrink-0">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">{item.name}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.rarity && (
                            <span className={`px-2 py-0.5 ${rarityStyle.bg} ${rarityStyle.text} text-xs rounded-full`}>
                              {item.rarity}
                            </span>
                          )}
                          {item.category && (
                            <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                              {CATEGORY_ICONS[item.category] || ''} {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{item.description}</p>
                    )}

                    {(item.weight != null || item.value != null) && (
                      <div className="flex items-center gap-3 mb-3">
                        {item.weight != null && (
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                            {item.weight} kg
                          </span>
                        )}
                        {item.value != null && (
                          <span className="px-2 py-0.5 bg-amber-900 text-amber-300 text-xs rounded">
                            {item.value} po
                          </span>
                        )}
                      </div>
                    )}

                    {effects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {effects.map((eff, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                              eff.modifier >= 0
                                ? 'bg-green-900 text-green-300'
                                : 'bg-red-900 text-red-300'
                            }`}
                          >
                            {formatModifier(eff.modifier)} {eff.stat}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.isConsumable && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-orange-900 text-orange-300 text-xs rounded font-semibold">
                          Consommable
                        </span>
                        {item.duration != null && (
                          <span className="text-gray-400 text-xs">{item.duration} tours</span>
                        )}
                        {item.isActive && (
                          <span className="px-2 py-0.5 bg-cyan-900 text-cyan-300 text-xs rounded font-semibold animate-pulse">
                            Actif {item.remainingTurns != null ? `(${item.remainingTurns} tours)` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {entityName && item.assignedToType && (
                      <div className="mb-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getAssignBadgeColor(item.assignedToType)}`}>
                          {getAssignLabel(item.assignedToType)}: {entityName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex border-t border-gray-700">
                    {item.isConsumable && item.assignedToId && (
                      item.isActive ? (
                        <button
                          onClick={() => handleDeactivateItem(item.id)}
                          className="flex-1 px-3 py-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-gray-700 transition"
                        >
                          Desactiver
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUseItem(item.id)}
                          className="flex-1 px-3 py-2 text-xs text-orange-400 hover:text-orange-300 hover:bg-gray-700 transition"
                        >
                          Utiliser
                        </button>
                      )
                    )}
                    {item.assignedToType && item.assignedToId ? (
                      <button
                        onClick={() => handleUnassign(item.id)}
                        className="flex-1 px-3 py-2 text-xs text-orange-400 hover:text-orange-300 hover:bg-gray-700 transition border-l border-gray-700"
                      >
                        Retirer
                      </button>
                    ) : (
                      <div className="flex-1 relative">
                        <button
                          onClick={() => setAssignDropdownId(assignDropdownId === item.id ? null : item.id)}
                          className="w-full px-3 py-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-gray-700 transition"
                        >
                          Donner
                        </button>
                        {assignDropdownId === item.id && (
                          <div className="absolute bottom-full left-0 mb-1 w-56 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
                            {characters.length > 0 && (
                              <div>
                                <p className="px-3 py-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-gray-750">Personnages</p>
                                {characters.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleAssign(item.id, 'character', c.id)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition"
                                  >
                                    {c.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            {monsters.length > 0 && (
                              <div>
                                <p className="px-3 py-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider bg-gray-750">Monstres</p>
                                {monsters.map((m) => (
                                  <button
                                    key={m.id}
                                    onClick={() => handleAssign(item.id, 'monster', m.id)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition"
                                  >
                                    {m.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            {npcs.length > 0 && (
                              <div>
                                <p className="px-3 py-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-gray-750">PNJ</p>
                                {npcs.map((n) => (
                                  <button
                                    key={n.id}
                                    onClick={() => handleAssign(item.id, 'npc', n.id)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition"
                                  >
                                    {n.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            {characters.length === 0 && monsters.length === 0 && npcs.length === 0 && (
                              <p className="px-3 py-2 text-xs text-gray-500">Aucune entite disponible.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 transition border-l border-gray-700"
                    >
                      Modifier
                    </button>
                    {deleteConfirmId === item.id ? (
                      <div className="flex border-l border-gray-700">
                        <button
                          onClick={() => handleDelete(item.id)}
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
                        onClick={() => setDeleteConfirmId(item.id)}
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
                {editingItem ? 'Modifier l\'objet' : 'Creer un objet'}
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
                        placeholder="Nom de l'objet"
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
                        placeholder="Description de l'objet..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Categorie</label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Rarete</label>
                        <select
                          value={form.rarity}
                          onChange={(e) => setForm((p) => ({ ...p, rarity: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                          {RARITIES.map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('properties')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Proprietes</span>
                  <span className="text-gray-400">{expandedSections.properties ? '\u2212' : '+'}</span>
                </button>
                {expandedSections.properties && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Poids (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.weight}
                        onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Valeur (pieces d'or)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.value}
                        onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-300">Consommable</label>
                    <button
                      onClick={() => setForm((p) => ({ ...p, isConsumable: !p.isConsumable }))}
                      className={`relative w-10 h-5 rounded-full transition ${
                        form.isConsumable ? 'bg-orange-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          form.isConsumable ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-gray-500 text-xs">
                      {form.isConsumable ? 'Les effets ne s\'appliquent qu\'a l\'utilisation' : 'Les effets s\'appliquent en permanence'}
                    </span>
                  </div>
                  {form.isConsumable && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Duree de l'effet (en tours)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.duration}
                        onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Ex: 3 tours"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <button
                  onClick={() => toggleSection('effects')}
                  className="w-full flex items-center justify-between text-white font-semibold text-sm py-2"
                >
                  <span>Effets ({form.effects.length})</span>
                  <span className="text-gray-400">{expandedSections.effects ? '\u2212' : '+'}</span>
                </button>
                {expandedSections.effects && (
                  <div className="mt-2">
                    {form.effects.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {form.effects.map((eff, i) => (
                          <span
                            key={i}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border font-semibold ${
                              eff.modifier >= 0
                                ? 'bg-green-900 text-green-300 border-green-700'
                                : 'bg-red-900 text-red-300 border-red-700'
                            }`}
                          >
                            {formatModifier(eff.modifier)} {eff.stat}
                            <button
                              onClick={() => removeEffect(i)}
                              className="ml-1 leading-none hover:opacity-70"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={newEffect.stat}
                        onChange={(e) => setNewEffect((p) => ({ ...p, stat: e.target.value }))}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      >
                        {STAT_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={newEffect.modifier}
                        onChange={(e) => setNewEffect((p) => ({ ...p, modifier: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addEffect();
                          }
                        }}
                        className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 text-center"
                        placeholder="0"
                      />
                      <button
                        onClick={addEffect}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg border border-gray-600 transition"
                      >
                        Ajouter
                      </button>
                    </div>
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
                {editingItem ? 'Sauvegarder' : 'Creer l\'objet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
