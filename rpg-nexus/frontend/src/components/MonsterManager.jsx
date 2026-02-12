// frontend/src/components/MonsterManager.jsx

import { useState, useEffect } from 'react';

const API = 'http://localhost:3000/api';

const authHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const STATS_D20 = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const STATS_LABELS = { strength: 'FOR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'SAG', charisma: 'CHA' };

const modifier = (val) => {
  if (!val) return '+0';
  const mod = Math.floor((val - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const emptyMonster = {
  name: '',
  image: '',
  description: '',
  showHp: true,
  showAc: false,
  showStats: false,
  showSpeed: false,
  showActions: false,
  hp: '',
  maxHp: '',
  ac: '',
  strength: '', dexterity: '', constitution: '', intelligence: '', wisdom: '', charisma: '',
  speed: '',
  actions: [],
};

export default function MonsterManager({ gameId }) {
  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMonster, setEditingMonster] = useState(null);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [form, setForm] = useState(emptyMonster);
  const [assets, setAssets] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [newAction, setNewAction] = useState({ name: '', description: '', damage: '' });

  useEffect(() => {
    loadMonsters();
    loadAssets();
  }, []);

  const loadMonsters = async () => {
    try {
      const res = await fetch(`${API}/monster/game/${gameId}`, { headers: authHeader() });
      const data = await res.json();
      setMonsters(data);
      // Sync selectedMonster avec les nouvelles données
      setSelectedMonster(prev => prev ? (data.find(m => m.id === prev.id) ?? prev) : null);
    } catch (e) {
      console.error('Erreur chargement monstres:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const res = await fetch(`${API}/asset/game/${gameId}`, { headers: authHeader() });
      const data = await res.json();
      setAssets(data.filter(a => {
        const mime = a.mimetype || a.mimeType || '';
        const url = a.url || '';
        return mime.startsWith('image/') || url.match(/\.(png|jpg|jpeg|gif|webp)$/i);
      }));
    } catch (e) {
      console.error('Erreur chargement assets:', e);
    }
  };

  const toFullUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://localhost:3000${url}`;
  };

  const openCreate = () => {
    setForm(emptyMonster);
    setEditingMonster(null);
    setShowForm(true);
  };

  const openEdit = (monster) => {
    setForm({
      ...monster,
      hp: monster.hp ?? '',
      maxHp: monster.maxHp ?? '',
      ac: monster.ac ?? '',
      strength: monster.strength ?? '', dexterity: monster.dexterity ?? '',
      constitution: monster.constitution ?? '', intelligence: monster.intelligence ?? '',
      wisdom: monster.wisdom ?? '', charisma: monster.charisma ?? '',
      speed: monster.speed ?? '',
      actions: monster.actions || [],
    });
    setEditingMonster(monster);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Le nom est requis !');

    // Payload propre - uniquement les champs attendus par le backend
    const payload = {
      name: form.name,
      image: form.image || null,
      description: form.description || null,
      showHp: form.showHp,
      showAc: form.showAc,
      showStats: form.showStats,
      showSpeed: form.showSpeed,
      showActions: form.showActions,
      hp:           form.hp !== ''           ? parseInt(form.hp)           : null,
      maxHp:        form.maxHp !== ''        ? parseInt(form.maxHp)        : null,
      ac:           form.ac !== ''           ? parseInt(form.ac)           : null,
      strength:     form.strength !== ''     ? parseInt(form.strength)     : null,
      dexterity:    form.dexterity !== ''    ? parseInt(form.dexterity)    : null,
      constitution: form.constitution !== '' ? parseInt(form.constitution) : null,
      intelligence: form.intelligence !== '' ? parseInt(form.intelligence) : null,
      wisdom:       form.wisdom !== ''       ? parseInt(form.wisdom)       : null,
      charisma:     form.charisma !== ''     ? parseInt(form.charisma)     : null,
      speed:        form.speed !== ''        ? parseInt(form.speed)        : null,
      actions: form.actions,
    };

    try {
      if (editingMonster) {
        await fetch(`${API}/monster/${editingMonster.id}`, {
          method: 'PUT',
          headers: authHeader(),
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API}/monster/game/${gameId}`, {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      await loadMonsters();
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
      alert('Erreur lors de la sauvegarde : ' + (e?.message || 'inconnue'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce monstre ?')) return;
    await fetch(`${API}/monster/${id}`, { method: 'DELETE', headers: authHeader() });
    if (selectedMonster?.id === id) setSelectedMonster(null);
    loadMonsters();
  };

  const updateHp = async (monster, newHp) => {
    const clamped = Math.max(0, Math.min(monster.maxHp || 9999, newHp));
    // Mise a jour optimiste : UI d'abord, API ensuite
    setMonsters(prev => prev.map(m => m.id === monster.id ? { ...m, hp: clamped } : m));
    setSelectedMonster(prev => prev?.id === monster.id ? { ...prev, hp: clamped } : prev);
    try {
      await fetch(`${API}/monster/${monster.id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ hp: clamped }),
      });
    } catch (e) {
      console.error('Erreur updateHp:', e);
    }
  };

  const updateStat = async (monster, field, value) => {
    const num = parseInt(value) || 0;
    // Mise a jour optimiste
    setMonsters(prev => prev.map(m => m.id === monster.id ? { ...m, [field]: num } : m));
    setSelectedMonster(prev => prev?.id === monster.id ? { ...prev, [field]: num } : prev);
    try {
      await fetch(`${API}/monster/${monster.id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ [field]: num }),
      });
    } catch (e) {
      console.error('Erreur updateStat:', e);
    }
  };

  const addAction = () => {
    if (!newAction.name.trim()) return;
    setForm(prev => ({
      ...prev,
      actions: [...prev.actions, { id: Date.now().toString(), ...newAction }],
    }));
    setNewAction({ name: '', description: '', damage: '' });
  };

  const removeAction = (idx) => {
    setForm(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== idx) }));
  };

  const hpPercent = (m) => {
    if (!m.maxHp) return 100;
    return Math.max(0, Math.min(100, (m.hp / m.maxHp) * 100));
  };

  const hpColor = (pct) => {
    if (pct <= 25) return 'bg-red-500';
    if (pct <= 50) return 'bg-orange-500';
    if (pct <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-xl">
      🐉 Chargement des monstres...
    </div>
  );

  return (
    <div className="flex h-full bg-gray-900 overflow-hidden">

      {/* LISTE */}
      <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">🐉 Monstres</h2>
          <button
            onClick={openCreate}
            className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition font-semibold"
          >
            + Créer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {monsters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-3">🐉</p>
              <p className="text-sm">Aucun monstre créé.</p>
              <p className="text-xs mt-1">Cliquez sur "+ Créer" !</p>
            </div>
          ) : (
            monsters.map(monster => {
              const pct = hpPercent(monster);
              return (
                <div
                  key={monster.id}
                  onClick={() => setSelectedMonster(monster)}
                  className={`rounded-xl border cursor-pointer transition p-3 ${
                    selectedMonster?.id === monster.id
                      ? 'border-red-500 bg-red-900 bg-opacity-20'
                      : 'border-gray-600 bg-gray-700 hover:bg-gray-650 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {monster.image ? (
                      <img src={toFullUrl(monster.image)} alt={monster.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-500" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-900 border-2 border-red-700 flex items-center justify-center text-xl">🐉</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{monster.name}</p>
                      {monster.showHp && monster.maxHp && (
                        <div className="mt-1">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>HP</span>
                            <span>{monster.hp ?? 0}/{monster.maxHp}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${hpColor(pct)}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL */}
      <div className="flex-1 overflow-y-auto">
        {!selectedMonster ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-6xl mb-4">🐉</p>
            <p className="text-lg">Sélectionnez un monstre</p>
            <p className="text-sm mt-2">ou créez-en un nouveau</p>
          </div>
        ) : (
          <div className="p-6 max-w-3xl mx-auto">

            {/* Header */}
            <div className="flex items-start gap-6 mb-6">
              {selectedMonster.image ? (
                <img src={toFullUrl(selectedMonster.image)} alt={selectedMonster.name} className="w-24 h-24 rounded-xl object-cover border-2 border-red-600" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-red-900 border-2 border-red-700 flex items-center justify-center text-4xl">🐉</div>
              )}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white">{selectedMonster.name}</h2>
                {selectedMonster.description && (
                  <p className="text-gray-400 mt-2 italic">{selectedMonster.description}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(selectedMonster)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">✏️ Modifier</button>
                  <button onClick={() => handleDelete(selectedMonster.id)} className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg">🗑️ Supprimer</button>
                </div>
              </div>
            </div>

            {/* HP avec contrôles */}
            {selectedMonster.showHp && selectedMonster.maxHp && (
              <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700">
                <h3 className="text-white font-bold mb-3">❤️ Points de Vie</h3>
                <div className="flex items-center gap-4">
                  <button onClick={() => updateHp(selectedMonster, (selectedMonster.hp ?? 0) - 1)} className="w-10 h-10 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xl font-bold">−</button>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">HP</span>
                      <span className="text-white font-bold">{selectedMonster.hp ?? 0} / {selectedMonster.maxHp}</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-4">
                      <div className={`h-4 rounded-full transition-all ${hpColor(hpPercent(selectedMonster))}`} style={{ width: `${hpPercent(selectedMonster)}%` }} />
                    </div>
                  </div>
                  <button onClick={() => updateHp(selectedMonster, (selectedMonster.hp ?? 0) + 1)} className="w-10 h-10 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xl font-bold">+</button>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[-10, -5, -1, '+1', '+5', '+10'].map(v => (
                    <button
                      key={v}
                      onClick={() => updateHp(selectedMonster, (selectedMonster.hp ?? 0) + parseInt(v))}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                        String(v).startsWith('+')
                          ? 'bg-green-800 hover:bg-green-700 text-green-200'
                          : 'bg-red-800 hover:bg-red-700 text-red-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CA + Vitesse */}
            {(selectedMonster.showAc || selectedMonster.showSpeed) && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {selectedMonster.showAc && (
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                    <p className="text-gray-400 text-sm mb-2">🛡️ Classe d'Armure</p>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => updateStat(selectedMonster, 'ac', (selectedMonster.ac ?? 10) - 1)} className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold">−</button>
                      <input
                        type="number" min="0" max="30"
                        value={selectedMonster.ac ?? 10}
                        onChange={e => updateStat(selectedMonster, 'ac', e.target.value)}
                        className="w-16 text-center text-2xl font-bold bg-gray-700 text-white border border-gray-600 rounded-lg py-1 focus:outline-none focus:border-blue-500"
                      />
                      <button onClick={() => updateStat(selectedMonster, 'ac', (selectedMonster.ac ?? 10) + 1)} className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold">+</button>
                    </div>
                  </div>
                )}
                {selectedMonster.showSpeed && (
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                    <p className="text-gray-400 text-sm mb-2">💨 Vitesse (ft)</p>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => updateStat(selectedMonster, 'speed', (selectedMonster.speed ?? 30) - 5)} className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold">−</button>
                      <input
                        type="number" min="0" max="999"
                        value={selectedMonster.speed ?? 30}
                        onChange={e => updateStat(selectedMonster, 'speed', e.target.value)}
                        className="w-16 text-center text-2xl font-bold bg-gray-700 text-white border border-gray-600 rounded-lg py-1 focus:outline-none focus:border-green-500"
                      />
                      <button onClick={() => updateStat(selectedMonster, 'speed', (selectedMonster.speed ?? 30) + 5)} className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold">+</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats D&D */}
            {selectedMonster.showStats && (
              <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700">
                <h3 className="text-white font-bold mb-3">🎲 Caractéristiques</h3>
                <div className="grid grid-cols-6 gap-2">
                  {STATS_D20.map(stat => (
                    <div key={stat} className="text-center bg-gray-700 rounded-lg p-2">
                      <p className="text-red-400 text-xs font-bold mb-1">{STATS_LABELS[stat]}</p>
                      <input
                        type="number" min="1" max="30"
                        value={selectedMonster[stat] ?? 10}
                        onChange={e => updateStat(selectedMonster, stat, e.target.value)}
                        className="w-full text-center text-lg font-bold bg-gray-600 text-white border border-gray-500 rounded py-1 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-gray-400 text-xs mt-1">{modifier(selectedMonster[stat] ?? 10)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {selectedMonster.showActions && selectedMonster.actions?.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700">
                <h3 className="text-white font-bold mb-3">⚔️ Actions</h3>
                <div className="space-y-3">
                  {selectedMonster.actions.map((action, i) => (
                    <div key={i} className="border-l-4 border-red-600 pl-3">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{action.name}</p>
                        {action.damage && (
                          <span className="px-2 py-0.5 bg-red-900 text-red-300 text-xs rounded-full">{action.damage}</span>
                        )}
                      </div>
                      {action.description && <p className="text-gray-400 text-sm mt-1">{action.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FORMULAIRE */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-2">
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl">

            {/* Header form */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-xl font-bold text-white">{editingMonster ? '✏️ Modifier le monstre' : '🐉 Créer un monstre'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Infos de base */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Nom du monstre *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="Ex: Gobelin, Dragon rouge..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500 h-20 resize-none"
                      placeholder="Description du monstre..."
                    />
                  </div>
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Image</label>
                  {form.image ? (
                    <div className="relative">
                      <img src={toFullUrl(form.image)} alt="monstre" className="w-full h-32 object-cover rounded-lg border border-gray-600" />
                      <button
                        onClick={() => setForm(p => ({ ...p, image: '' }))}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowImagePicker(true)}
                      className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-red-500 hover:text-red-400 transition"
                    >
                      <span className="text-3xl">🖼️</span>
                      <span className="text-sm mt-1">Choisir une image</span>
                    </button>
                  )}
                  {assets.length > 0 && !form.image && showImagePicker && (
                    <div className="mt-2 grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                      {assets.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setForm(p => ({ ...p, image: a.url })); setShowImagePicker(false); }}
                          className="aspect-square rounded-lg overflow-hidden border border-gray-600 hover:border-red-500"
                        >
                          <img src={toFullUrl(a.url)} alt={a.filename} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats à activer */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">Stats à afficher</label>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: 'showHp', label: '❤️ HP', color: 'red' },
                    { key: 'showAc', label: '🛡️ CA', color: 'blue' },
                    { key: 'showStats', label: '🎲 Stats D&D', color: 'purple' },
                    { key: 'showSpeed', label: '💨 Vitesse', color: 'green' },
                    { key: 'showActions', label: '⚔️ Actions', color: 'orange' },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                      className={`p-2 rounded-lg border-2 text-sm font-semibold transition ${
                        form[key] ? `border-${color}-500 bg-${color}-900 bg-opacity-30 text-white` : 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* HP */}
              {form.showHp && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700 rounded-xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">HP actuels</label>
                    <input type="number" value={form.hp} onChange={e => setForm(p => ({ ...p, hp: e.target.value }))} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="Ex: 52" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">HP maximum</label>
                    <input type="number" value={form.maxHp} onChange={e => setForm(p => ({ ...p, maxHp: e.target.value }))} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="Ex: 52" />
                  </div>
                </div>
              )}

              {/* CA */}
              {form.showAc && (
                <div className="p-4 bg-gray-700 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Classe d'Armure (CA)</label>
                  <input type="number" value={form.ac} onChange={e => setForm(p => ({ ...p, ac: e.target.value }))} className="w-40 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="Ex: 15" />
                </div>
              )}

              {/* Vitesse */}
              {form.showSpeed && (
                <div className="p-4 bg-gray-700 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Vitesse (en pieds)</label>
                  <input type="number" value={form.speed} onChange={e => setForm(p => ({ ...p, speed: e.target.value }))} className="w-40 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-green-500" placeholder="Ex: 30" />
                </div>
              )}

              {/* Stats D&D */}
              {form.showStats && (
                <div className="p-4 bg-gray-700 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Caractéristiques D&D</label>
                  <div className="grid grid-cols-6 gap-3">
                    {STATS_D20.map(stat => (
                      <div key={stat}>
                        <label className="block text-xs font-bold text-red-400 mb-1 text-center">{STATS_LABELS[stat]}</label>
                        <input
                          type="number" min="1" max="30"
                          value={form[stat]}
                          onChange={e => setForm(p => ({ ...p, [stat]: e.target.value }))}
                          className="w-full px-2 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-center focus:outline-none focus:border-purple-500"
                          placeholder="10"
                        />
                        {form[stat] && <p className="text-center text-xs text-gray-400 mt-1">{modifier(parseInt(form[stat]))}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {form.showActions && (
                <div className="p-4 bg-gray-700 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">⚔️ Actions</label>

                  {form.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2 p-2 bg-gray-600 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{action.name}</p>
                        {action.damage && <span className="text-xs text-red-400">{action.damage}</span>}
                        {action.description && <p className="text-gray-400 text-xs mt-1">{action.description}</p>}
                      </div>
                      <button onClick={() => removeAction(i)} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
                    </div>
                  ))}

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <input
                      type="text"
                      value={newAction.name}
                      onChange={e => setNewAction(p => ({ ...p, name: e.target.value }))}
                      className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                      placeholder="Nom de l'action"
                    />
                    <input
                      type="text"
                      value={newAction.damage}
                      onChange={e => setNewAction(p => ({ ...p, damage: e.target.value }))}
                      className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                      placeholder="Dégâts (ex: 2d6+3)"
                    />
                    <input
                      type="text"
                      value={newAction.description}
                      onChange={e => setNewAction(p => ({ ...p, description: e.target.value }))}
                      className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                      placeholder="Description"
                    />
                  </div>
                  <button onClick={addAction} className="mt-2 px-4 py-1 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg transition">
                    + Ajouter l'action
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-700 shrink-0">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
                Annuler
              </button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition font-bold">
                {editingMonster ? '✅ Sauvegarder' : '🐉 Créer le monstre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
