// frontend/src/components/ModelBuilder.jsx

import { useState, useEffect } from 'react';
import { customModelAPI } from '../services/api';

const PRESETS_CONFIG = [
  { key: 'hp',       label: '❤️ HP',          desc: 'Points de vie avec barre de vie',        color: 'red' },
  { key: 'ac',       label: '🛡️ CA',           desc: "Classe d'armure",                         color: 'blue' },
  { key: 'dndStats', label: '🎲 Stats D&D',    desc: 'FOR / DEX / CON / INT / SAG / CHA',      color: 'purple' },
  { key: 'speed',    label: '💨 Vitesse',       desc: 'Vitesse de déplacement en pieds',         color: 'green' },
  { key: 'actions',  label: '⚔️ Actions',       desc: 'Attaques et actions spéciales',           color: 'orange' },
];

export default function ModelBuilder({ gameId, model, onClose, onSuccess }) {
  const [name, setName] = useState(model?.name || '');
  const [description, setDescription] = useState(model?.description || '');
  const [stats, setStats] = useState(model?.schema?.stats || {});
  const [fields, setFields] = useState(model?.schema?.fields || {});
  const [presets, setPresets] = useState(model?.schema?.presets || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newStatName, setNewStatName] = useState('');
  const [newStatDefault, setNewStatDefault] = useState(10);
  const [newStatMin, setNewStatMin] = useState(1);
  const [newStatMax, setNewStatMax] = useState(20);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // ═══════════════════════════════════════
  // PRÉRÉGLAGES RPG
  // ═══════════════════════════════════════

  const togglePreset = (key) => {
    const isOn = !presets[key];
    setPresets(prev => ({ ...prev, [key]: isOn }));

    if (isOn) {
      // Ajouter les stats/fields du préréglage
      switch (key) {
        case 'hp':
          setStats(prev => ({
            ...prev,
            HP: { type: 'number', default: 10, min: 0, max: 999 },
            'HP Max': { type: 'number', default: 10, min: 1, max: 999 },
          }));
          break;
        case 'ac':
          setStats(prev => ({
            ...prev,
            CA: { type: 'number', default: 10, min: 0, max: 30 },
          }));
          break;
        case 'dndStats':
          setStats(prev => ({
            ...prev,
            FOR: { type: 'number', default: 10, min: 1, max: 30 },
            DEX: { type: 'number', default: 10, min: 1, max: 30 },
            CON: { type: 'number', default: 10, min: 1, max: 30 },
            INT: { type: 'number', default: 10, min: 1, max: 30 },
            SAG: { type: 'number', default: 10, min: 1, max: 30 },
            CHA: { type: 'number', default: 10, min: 1, max: 30 },
          }));
          break;
        case 'speed':
          setStats(prev => ({
            ...prev,
            Vitesse: { type: 'number', default: 30, min: 0, max: 999 },
          }));
          break;
        case 'actions':
          setFields(prev => ({
            ...prev,
            _actions: { type: 'actions', required: false },
          }));
          break;
        default:
          break;
      }
    } else {
      // Retirer les stats/fields du préréglage
      switch (key) {
        case 'hp':
          setStats(prev => { const n = { ...prev }; delete n['HP']; delete n['HP Max']; return n; });
          break;
        case 'ac':
          setStats(prev => { const n = { ...prev }; delete n['CA']; return n; });
          break;
        case 'dndStats':
          setStats(prev => {
            const n = { ...prev };
            ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'].forEach(k => delete n[k]);
            return n;
          });
          break;
        case 'speed':
          setStats(prev => { const n = { ...prev }; delete n['Vitesse']; return n; });
          break;
        case 'actions':
          setFields(prev => { const n = { ...prev }; delete n['_actions']; return n; });
          break;
        default:
          break;
      }
    }
  };

  // ═══════════════════════════════════════
  // STATS PERSONNALISÉES
  // ═══════════════════════════════════════

  const addStat = () => {
    if (!newStatName.trim()) return;
    setStats({
      ...stats,
      [newStatName]: { type: 'number', default: newStatDefault, min: newStatMin, max: newStatMax },
    });
    setNewStatName(''); setNewStatDefault(10); setNewStatMin(1); setNewStatMax(20);
  };

  const removeStat = (statName) => {
    const n = { ...stats };
    delete n[statName];
    setStats(n);
  };

  // ═══════════════════════════════════════
  // CHAMPS PERSONNALISÉS
  // ═══════════════════════════════════════

  const addField = () => {
    if (!newFieldName.trim()) return;
    const fieldConfig = { type: newFieldType, required: false };
    if (newFieldType === 'select' && newFieldOptions) {
      fieldConfig.options = newFieldOptions.split(',').map(o => o.trim());
    }
    setFields({ ...fields, [newFieldName]: fieldConfig });
    setNewFieldName(''); setNewFieldType('text'); setNewFieldOptions('');
  };

  const removeField = (fieldName) => {
    const n = { ...fields };
    delete n[fieldName];
    setFields(n);
  };

  // ═══════════════════════════════════════
  // SAUVEGARDE
  // ═══════════════════════════════════════

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const schema = { stats, fields, presets };
    try {
      if (model) {
        await customModelAPI.update(model.id, { name, description, schema });
      } else {
        await customModelAPI.create({ name, description, schema, gameId });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Stats qui ne viennent PAS d'un préréglage
  const presetStatKeys = ['HP', 'HP Max', 'CA', 'FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA', 'Vitesse'];
  const customStats = Object.entries(stats).filter(([k]) => !presetStatKeys.includes(k));
  const customFields = Object.entries(fields).filter(([k]) => k !== '_actions');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 rounded-t-xl flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-bold text-white">
            {model ? '✏️ Modifier le template' : '📋 Créer un template'}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 p-3 rounded-lg">{error}</div>
          )}

          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Nom du template *</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ex: Fiche Guerrier Médiéval"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Description</label>
              <input
                type="text" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ex: Pour jeux médiévaux-fantastiques"
              />
            </div>
          </div>

          {/* ── PRÉRÉGLAGES RPG ── */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-bold text-white mb-1">⚡ Préréglages RPG</h3>
            <p className="text-xs text-gray-400 mb-4">Active les blocs de stats standard. Ils seront affichés avec une interface dédiée dans la fiche personnage.</p>
            <div className="grid grid-cols-5 gap-3">
              {PRESETS_CONFIG.map(({ key, label, desc, color }) => {
                const isOn = !!presets[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePreset(key)}
                    title={desc}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition text-center ${
                      isOn
                        ? `border-${color}-500 bg-${color}-900 bg-opacity-40 text-white`
                        : 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-lg mb-1">{label.split(' ')[0]}</div>
                    <div className="text-xs leading-tight">{label.split(' ').slice(1).join(' ')}</div>
                    {isOn && <div className="text-xs mt-1 text-green-400">✓ Activé</div>}
                  </button>
                );
              })}
            </div>

            {/* Aperçu des stats ajoutées par les préréglages */}
            {Object.keys(presets).some(k => presets[k]) && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-2">Stats ajoutées automatiquement :</p>
                <div className="flex flex-wrap gap-2">
                  {presets.hp && ['HP', 'HP Max'].map(s => (
                    <span key={s} className="px-2 py-1 bg-red-900 text-red-300 text-xs rounded-full">{s}</span>
                  ))}
                  {presets.ac && <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded-full">CA</span>}
                  {presets.dndStats && ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'].map(s => (
                    <span key={s} className="px-2 py-1 bg-purple-900 text-purple-300 text-xs rounded-full">{s}</span>
                  ))}
                  {presets.speed && <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded-full">Vitesse</span>}
                  {presets.actions && <span className="px-2 py-1 bg-orange-900 text-orange-300 text-xs rounded-full">⚔️ Actions</span>}
                </div>
              </div>
            )}
          </div>

          {/* ── STATS PERSONNALISÉES ── */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-bold text-white mb-1">📊 Statistiques personnalisées</h3>
            <p className="text-xs text-gray-400 mb-4">Ajoute tes propres stats numériques (ex: Niveau, Expérience, Mana...)</p>

            {customStats.length > 0 && (
              <div className="space-y-2 mb-4">
                {customStats.map(([statName, statConfig]) => (
                  <div key={statName} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                    <div>
                      <span className="font-semibold text-white">{statName}</span>
                      <span className="text-sm text-gray-400 ml-3">
                        Min: {statConfig.min} | Max: {statConfig.max} | Défaut: {statConfig.default}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeStat(statName)} className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded-lg text-sm transition">🗑️</button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-700 pt-4">
              <div className="grid grid-cols-5 gap-2">
                <input type="text" value={newStatName} onChange={e => setNewStatName(e.target.value)}
                  placeholder="Nom (ex: Mana)" className="col-span-2 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="number" value={newStatMin} onChange={e => setNewStatMin(parseInt(e.target.value))}
                  placeholder="Min" className="px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="number" value={newStatMax} onChange={e => setNewStatMax(parseInt(e.target.value))}
                  placeholder="Max" className="px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="number" value={newStatDefault} onChange={e => setNewStatDefault(parseInt(e.target.value))}
                  placeholder="Défaut" className="px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <button type="button" onClick={addStat} className="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                ➕ Ajouter la statistique
              </button>
            </div>
          </div>

          {/* ── CHAMPS PERSONNALISÉS ── */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-base font-bold text-white mb-1">📝 Champs personnalisés</h3>
            <p className="text-xs text-gray-400 mb-4">Champs texte, liste déroulante... (ex: Race, Classe, Historique)</p>

            {customFields.length > 0 && (
              <div className="space-y-2 mb-4">
                {customFields.map(([fieldName, fieldConfig]) => (
                  <div key={fieldName} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                    <div>
                      <span className="font-semibold text-white">{fieldName}</span>
                      <span className="text-sm text-gray-400 ml-3">
                        Type: {fieldConfig.type}
                        {fieldConfig.options && ` | Options: ${fieldConfig.options.join(', ')}`}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeField(fieldName)} className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded-lg text-sm transition">🗑️</button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-700 pt-4 space-y-2">
              <input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                placeholder="Nom du champ (ex: Race, Classe)" className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <select value={newFieldType} onChange={e => setNewFieldType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="text">Texte court</option>
                <option value="select">Liste déroulante</option>
                <option value="textarea">Zone de texte (long)</option>
              </select>
              {newFieldType === 'select' && (
                <input type="text" value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)}
                  placeholder="Options séparées par des virgules (ex: Humain, Elfe, Nain)"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              )}
              <button type="button" onClick={addField} className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                ➕ Ajouter le champ
              </button>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
              Annuler
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50 font-bold">
              {loading ? 'Enregistrement...' : model ? '✅ Modifier' : '📋 Créer le template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
