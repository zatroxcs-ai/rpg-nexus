// frontend/src/components/CharacterForm.jsx

import { useState, useEffect } from 'react';
import { customModelAPI } from '../services/api';

const DND_STATS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
const modifier = (val) => {
  if (!val) return '+0';
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

export default function CharacterForm({ gameId, character, onSubmit, onCancel }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({ name: '', avatar: '', modelId: '', data: {} });
  const [loading, setLoading] = useState(false);
  const [newAction, setNewAction] = useState({ name: '', description: '', damage: '' });

  useEffect(() => { loadTemplates(); }, [gameId]);

  useEffect(() => {
    if (character) {
      const savedModelId = character.modelId || character.data?._modelId || '';
      setFormData({
        name: character.name || '',
        avatar: character.avatarUrl || character.avatar || '',
        modelId: savedModelId,
        data: character.data || {},
      });
      if (savedModelId) loadTemplate(savedModelId);
    }
  }, [character]);

  const loadTemplates = async () => {
    try {
      const data = await customModelAPI.getByGame(gameId);
      setTemplates(data);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    }
  };

  const loadTemplate = async (modelId) => {
    try {
      const template = await customModelAPI.getById(modelId);
      setSelectedTemplate(template);
      if (!character) {
        const defaultData = {};
        if (template.schema?.stats) {
          Object.entries(template.schema.stats).forEach(([key, config]) => {
            defaultData[key] = config.default ?? 0;
          });
        }
        if (template.schema?.fields) {
          Object.entries(template.schema.fields).forEach(([key, config]) => {
            defaultData[key] = config.type === 'actions' ? [] : '';
          });
        }
        setFormData(prev => ({ ...prev, data: defaultData }));
      }
    } catch (error) {
      console.error('Erreur chargement template:', error);
    }
  };

  const handleTemplateChange = (e) => {
    const modelId = e.target.value;
    setFormData({ ...formData, modelId, data: {} });
    if (modelId) loadTemplate(modelId);
    else setSelectedTemplate(null);
  };

  const setData = (key, value) => {
    setFormData(prev => ({ ...prev, data: { ...prev.data, [key]: value } }));
  };

  const addAction = () => {
    if (!newAction.name.trim()) return;
    const actions = Array.isArray(formData.data._actions) ? formData.data._actions : [];
    setData('_actions', [...actions, { id: Date.now().toString(), ...newAction }]);
    setNewAction({ name: '', description: '', damage: '' });
  };

  const removeAction = (idx) => {
    const actions = [...(formData.data._actions || [])];
    actions.splice(idx, 1);
    setData('_actions', actions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { alert('Le nom du personnage est requis'); return; }
    if (!formData.modelId) { alert('Veuillez sélectionner un template'); return; }
    setLoading(true);
    try {
      const isEditing = !!character;
      const payload = {
        name: formData.name,
        // gameId uniquement pour la creation (UpdateCharacterDto ne l'accepte pas)
        ...(!isEditing && { gameId }),
        // avatar -> avatarUrl (chaine vide = undefined pour eviter @IsUrl() fail)
        avatarUrl: formData.avatar && formData.avatar.trim() !== '' ? formData.avatar : undefined,
        // Stocke le modelId dans data._modelId pour le relire a l'edition
        data: { ...formData.data, _modelId: formData.modelId },
      };
      await onSubmit(payload);
    } catch (error) {
      console.error('Erreur soumission:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur inconnue';
      alert('Erreur : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally {
      setLoading(false);
    }
  };

  const presets = selectedTemplate?.schema?.presets || {};
  const allStats = selectedTemplate?.schema?.stats || {};
  const allFields = selectedTemplate?.schema?.fields || {};

  const presetStatKeys = ['HP', 'HP Max', 'CA', 'FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA', 'Vitesse'];
  const customStats = Object.entries(allStats).filter(([k]) => !presetStatKeys.includes(k));
  const customFields = Object.entries(allFields).filter(([k]) => k !== '_actions');

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── INFOS DE BASE ── */}
      <div className="space-y-3">
        <h4 className="font-bold text-white flex items-center gap-2">⭐ Informations de Base</h4>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nom <span className="text-red-400">*</span></label>
          <input type="text" value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })} required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ex: Aragorn, Gandalf..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Avatar (URL)</label>
          <input type="url" value={formData.avatar}
            onChange={e => setFormData({ ...formData, avatar: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Type de personnage <span className="text-red-400">*</span></label>
          <select value={formData.modelId} onChange={handleTemplateChange} required disabled={!!character}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
            <option value="">-- Sélectionner un template --</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {selectedTemplate && (
        <>
          {/* ── HP ── */}
          {presets.hp && (
            <div className="bg-gray-800 rounded-xl p-4 border border-red-900">
              <h4 className="font-bold text-white mb-3">❤️ Points de Vie</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">HP actuels</label>
                  <input type="number" min={0} max={allStats['HP Max']?.max || 999}
                    value={formData.data['HP'] ?? allStats['HP']?.default ?? 10}
                    onChange={e => setData('HP', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">HP maximum</label>
                  <input type="number" min={1} max={999}
                    value={formData.data['HP Max'] ?? allStats['HP Max']?.default ?? 10}
                    onChange={e => setData('HP Max', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* ── CA + VITESSE ── */}
          {(presets.ac || presets.speed) && (
            <div className={`grid gap-3 ${presets.ac && presets.speed ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {presets.ac && (
                <div className="bg-gray-800 rounded-xl p-4 border border-blue-900">
                  <h4 className="font-bold text-white mb-3">🛡️ Classe d'Armure</h4>
                  <input type="number" min={0} max={30}
                    value={formData.data['CA'] ?? allStats['CA']?.default ?? 10}
                    onChange={e => setData('CA', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              {presets.speed && (
                <div className="bg-gray-800 rounded-xl p-4 border border-green-900">
                  <h4 className="font-bold text-white mb-3">💨 Vitesse (pieds)</h4>
                  <input type="number" min={0} max={999}
                    value={formData.data['Vitesse'] ?? allStats['Vitesse']?.default ?? 30}
                    onChange={e => setData('Vitesse', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              )}
            </div>
          )}

          {/* ── STATS D&D ── */}
          {presets.dndStats && (
            <div className="bg-gray-800 rounded-xl p-4 border border-purple-900">
              <h4 className="font-bold text-white mb-3">🎲 Caractéristiques D&D</h4>
              <div className="grid grid-cols-6 gap-2">
                {DND_STATS.map(stat => (
                  <div key={stat} className="text-center">
                    <label className="block text-xs font-bold text-purple-400 mb-1">{stat}</label>
                    <input type="number" min={1} max={30}
                      value={formData.data[stat] ?? allStats[stat]?.default ?? 10}
                      onChange={e => setData(stat, parseInt(e.target.value) || 1)}
                      className="w-full px-1 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <p className="text-xs text-gray-400 mt-1">{modifier(formData.data[stat] ?? 10)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ACTIONS ── */}
          {presets.actions && (
            <div className="bg-gray-800 rounded-xl p-4 border border-orange-900">
              <h4 className="font-bold text-white mb-3">⚔️ Actions</h4>

              {(formData.data._actions || []).map((action, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 p-2 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{action.name}</p>
                    {action.damage && <span className="text-xs text-orange-400">{action.damage}</span>}
                    {action.description && <p className="text-gray-400 text-xs mt-1">{action.description}</p>}
                  </div>
                  <button type="button" onClick={() => removeAction(i)} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
                </div>
              ))}

              <div className="grid grid-cols-3 gap-2 mt-3">
                <input type="text" value={newAction.name} onChange={e => setNewAction(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nom de l'action"
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <input type="text" value={newAction.damage} onChange={e => setNewAction(p => ({ ...p, damage: e.target.value }))}
                  placeholder="Dégâts (ex: 2d6+3)"
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <input type="text" value={newAction.description} onChange={e => setNewAction(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description"
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <button type="button" onClick={addAction} className="mt-2 w-full px-4 py-1 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg transition">
                + Ajouter l'action
              </button>
            </div>
          )}

          {/* ── STATS PERSONNALISÉES ── */}
          {customStats.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-white">📊 Statistiques</h4>
              <div className="grid grid-cols-2 gap-3">
                {customStats.map(([key, config]) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-300 mb-1">
                      {key}
                      {config.min !== undefined && <span className="text-xs text-gray-500 ml-2">({config.min}–{config.max})</span>}
                    </label>
                    <input type="number" min={config.min} max={config.max}
                      value={formData.data[key] ?? config.default ?? 0}
                      onChange={e => setData(key, parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CHAMPS PERSONNALISÉS ── */}
          {customFields.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-white">📝 Informations</h4>
              <div className="space-y-3">
                {customFields.map(([key, config]) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-300 mb-1">
                      {key}{config.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {config.type === 'select' ? (
                      <select value={formData.data[key] || ''} onChange={e => setData(key, e.target.value)} required={config.required}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">-- Sélectionner --</option>
                        {config.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : config.type === 'textarea' ? (
                      <textarea value={formData.data[key] || ''} onChange={e => setData(key, e.target.value)} required={config.required} rows={3}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    ) : (
                      <input type="text" value={formData.data[key] || ''} onChange={e => setData(key, e.target.value)} required={config.required}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Boutons */}
      <div className="flex gap-3 pt-4 border-t border-gray-700">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
          Annuler
        </button>
        <button type="submit" disabled={loading || !selectedTemplate}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 font-bold">
          {loading ? 'Enregistrement...' : character ? '✅ Modifier' : '✨ Créer'}
        </button>
      </div>
    </form>
  );
}
