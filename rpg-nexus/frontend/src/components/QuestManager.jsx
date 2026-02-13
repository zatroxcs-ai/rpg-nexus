import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useDataSync from '../hooks/useDataSync';

const PRIORITY_CONFIG = {
  MAIN: { label: 'Principale', bg: 'bg-amber-900', text: 'text-amber-300', border: 'border-amber-500', pill: 'bg-amber-800 text-amber-200' },
  SECONDARY: { label: 'Secondaire', bg: 'bg-indigo-900', text: 'text-indigo-300', border: 'border-indigo-500', pill: 'bg-indigo-800 text-indigo-200' },
  HIDDEN: { label: 'Cachee', bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-500', pill: 'bg-gray-700 text-gray-300' },
};

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', bg: 'bg-green-900', text: 'text-green-300', pill: 'bg-green-800 text-green-200' },
  COMPLETED: { label: 'Terminee', bg: 'bg-blue-900', text: 'text-blue-300', pill: 'bg-blue-800 text-blue-200' },
  FAILED: { label: 'Echouee', bg: 'bg-red-900', text: 'text-red-300', pill: 'bg-red-800 text-red-200' },
};

const STATUS_TABS = [
  { key: 'all', label: 'Toutes' },
  { key: 'ACTIVE', label: 'Actives' },
  { key: 'COMPLETED', label: 'Terminees' },
  { key: 'FAILED', label: 'Echouees' },
];

const ENTITY_TYPE_LABELS = {
  character: 'PJ',
  npc: 'PNJ',
  monster: 'Monstre',
};

const ENTITY_TYPE_COLORS = {
  character: 'bg-blue-900 text-blue-300',
  npc: 'bg-emerald-900 text-emerald-300',
  monster: 'bg-red-900 text-red-300',
};

const toFullUrl = (url) => !url ? null : url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;

export default function QuestManager({ gameId }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [selectedQuestData, setSelectedQuestData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [characters, setCharacters] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [items, setItems] = useState([]);
  const [editFields, setEditFields] = useState({});
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [rewardDropdownOpen, setRewardDropdownOpen] = useState(false);
  const [rewardQuantity, setRewardQuantity] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    loadQuests();
    api.get('/character/game/' + gameId).then(r => setCharacters(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/npc/game/' + gameId).then(r => setNpcs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/monster/game/' + gameId).then(r => setMonsters(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/item/game/' + gameId).then(r => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [gameId]);

  const syncQuests = useCallback(() => { loadQuests(); }, [gameId]);
  useDataSync('quest', syncQuests);

  const loadQuests = async () => {
    try {
      const res = await api.get('/quest/game/' + gameId);
      setQuests(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load quests:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestDetail = async (questId) => {
    try {
      const res = await api.get('/quest/' + questId);
      setSelectedQuestData(res.data);
      setEditFields({
        title: res.data.title || '',
        description: res.data.description || '',
        xpReward: res.data.xpReward ?? '',
        deadline: res.data.deadline || '',
        gmNotes: res.data.gmNotes || '',
        priority: res.data.priority || 'MAIN',
        parentQuestId: res.data.parentQuestId || '',
      });
    } catch (e) {
      console.error('Failed to load quest detail:', e);
    }
  };

  const selectQuest = (quest) => {
    setSelectedQuest(quest.id);
    setNewStepTitle('');
    setNewStepDesc('');
    setAssignDropdownOpen(false);
    setRewardDropdownOpen(false);
    setDeleteConfirm(false);
    loadQuestDetail(quest.id);
  };

  const handleCreateQuest = async () => {
    if (!newQuestTitle.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/quest/game/' + gameId, {
        title: newQuestTitle.trim(),
        status: 'ACTIVE',
        priority: 'MAIN',
      });
      setNewQuestTitle('');
      await loadQuests();
      if (res.data && res.data.id) {
        selectQuest(res.data);
      }
    } catch (e) {
      console.error('Failed to create quest:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuest = async (fields) => {
    if (!selectedQuest) return;
    try {
      await api.put('/quest/' + selectedQuest, fields);
      await loadQuests();
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to update quest:', e);
    }
  };

  const handleDeleteQuest = async () => {
    if (!selectedQuest) return;
    try {
      await api.delete('/quest/' + selectedQuest);
      setSelectedQuest(null);
      setSelectedQuestData(null);
      setDeleteConfirm(false);
      await loadQuests();
    } catch (e) {
      console.error('Failed to delete quest:', e);
    }
  };

  const handleCompleteQuest = async () => {
    if (!selectedQuest) return;
    try {
      await api.post('/quest/' + selectedQuest + '/complete');
      await loadQuests();
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to complete quest:', e);
    }
  };

  const handleFailQuest = async () => {
    if (!selectedQuest) return;
    try {
      await api.post('/quest/' + selectedQuest + '/fail');
      await loadQuests();
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to fail quest:', e);
    }
  };

  const handleReactivateQuest = async () => {
    if (!selectedQuest) return;
    try {
      await api.post('/quest/' + selectedQuest + '/reactivate');
      await loadQuests();
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to reactivate quest:', e);
    }
  };

  const handleAddStep = async () => {
    if (!selectedQuest || !newStepTitle.trim()) return;
    try {
      await api.post('/quest/' + selectedQuest + '/step', {
        title: newStepTitle.trim(),
        description: newStepDesc.trim() || undefined,
      });
      setNewStepTitle('');
      setNewStepDesc('');
      await loadQuests();
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to add step:', e);
    }
  };

  const handleToggleStep = async (stepId) => {
    try {
      await api.put('/quest/step/' + stepId + '/toggle');
      await loadQuests();
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to toggle step:', e);
    }
  };

  const handleDeleteStep = async (stepId) => {
    try {
      await api.delete('/quest/step/' + stepId);
      await loadQuests();
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to delete step:', e);
    }
  };

  const handleAddAssignment = async (entityType, entity) => {
    if (!selectedQuest) return;
    try {
      await api.post('/quest/' + selectedQuest + '/assignment', {
        entityType,
        entityId: entity.id,
        entityName: entity.name,
        entityAvatar: entity.avatar || entity.image || null,
      });
      setAssignDropdownOpen(false);
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to add assignment:', e);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await api.delete('/quest/assignment/' + assignmentId);
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to remove assignment:', e);
    }
  };

  const handleAddReward = async (item) => {
    if (!selectedQuest) return;
    try {
      await api.post('/quest/' + selectedQuest + '/reward', {
        itemId: item.id,
        itemName: item.name,
        itemImage: item.image || null,
        quantity: rewardQuantity || 1,
      });
      setRewardDropdownOpen(false);
      setRewardQuantity(1);
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to add reward:', e);
    }
  };

  const handleRemoveReward = async (rewardId) => {
    try {
      await api.delete('/quest/reward/' + rewardId);
      await loadQuestDetail(selectedQuest);
    } catch (e) {
      console.error('Failed to remove reward:', e);
    }
  };

  const priorityOrder = { MAIN: 0, SECONDARY: 1, HIDDEN: 2 };

  const filteredQuests = quests
    .filter(q => statusFilter === 'all' || q.status === statusFilter)
    .sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99;
      const pb = priorityOrder[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

  const getStepProgress = (quest) => {
    const steps = quest.steps || [];
    if (steps.length === 0) return null;
    const completed = steps.filter(s => s.isCompleted).length;
    return { completed, total: steps.length };
  };

  const getAssignmentCount = (quest) => {
    return (quest.assignments || []).length;
  };

  const childQuests = selectedQuestData
    ? quests.filter(q => q.parentQuestId === selectedQuestData.id)
    : [];

  const otherQuests = selectedQuestData
    ? quests.filter(q => q.id !== selectedQuestData.id)
    : quests;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xl">
        Chargement des quetes...
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex overflow-hidden">
      <div className="w-80 shrink-0 border-r border-gray-700 flex flex-col bg-gray-800">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg mb-3">Gestionnaire de Quetes</h2>
          <div className="flex gap-1 mb-3">
            <input
              type="text"
              value={newQuestTitle}
              onChange={(e) => setNewQuestTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateQuest(); }}
              placeholder="Nouvelle quete..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={handleCreateQuest}
              disabled={saving || !newQuestTitle.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition font-semibold shrink-0"
            >
              + Creer
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === tab.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredQuests.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              {quests.length === 0 ? 'Aucune quete creee.' : 'Aucune quete ne correspond au filtre.'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredQuests.map(quest => {
                const priorityStyle = PRIORITY_CONFIG[quest.priority] || PRIORITY_CONFIG.MAIN;
                const statusStyle = STATUS_CONFIG[quest.status] || STATUS_CONFIG.ACTIVE;
                const progress = getStepProgress(quest);
                const assignCount = getAssignmentCount(quest);
                const isSelected = selectedQuest === quest.id;
                return (
                  <button
                    key={quest.id}
                    onClick={() => selectQuest(quest)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      isSelected
                        ? 'bg-indigo-900/40 border border-indigo-500'
                        : 'bg-gray-800 border border-transparent hover:bg-gray-750 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-white font-semibold text-sm flex-1 line-clamp-2">{quest.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityStyle.pill}`}>
                        {priorityStyle.label}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyle.pill}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      {progress && (
                        <span>{progress.completed}/{progress.total} etapes</span>
                      )}
                      {assignCount > 0 && (
                        <span>{assignCount} assigne{assignCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {progress && (
                      <div className="mt-1.5 w-full bg-gray-700 rounded-full h-1">
                        <div
                          className="bg-indigo-500 h-1 rounded-full transition-all"
                          style={{ width: (progress.completed / progress.total * 100) + '%' }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedQuestData ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-lg">Selectionnez une quete</p>
            <p className="text-sm mt-1">ou creez-en une nouvelle</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-4xl">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={editFields.title || ''}
                  onChange={(e) => setEditFields(p => ({ ...p, title: e.target.value }))}
                  onBlur={() => {
                    if (editFields.title.trim() && editFields.title !== selectedQuestData.title) {
                      handleUpdateQuest({ title: editFields.title.trim() });
                    }
                  }}
                  className="w-full bg-transparent text-white text-2xl font-bold border-b border-transparent hover:border-gray-600 focus:border-indigo-500 focus:outline-none pb-1 transition"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={editFields.priority || 'MAIN'}
                  onChange={(e) => {
                    setEditFields(p => ({ ...p, priority: e.target.value }));
                    handleUpdateQuest({ priority: e.target.value });
                  }}
                  className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="MAIN">Principale</option>
                  <option value="SECONDARY">Secondaire</option>
                  <option value="HIDDEN">Cachee</option>
                </select>
                {selectedQuestData.status && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${(STATUS_CONFIG[selectedQuestData.status] || STATUS_CONFIG.ACTIVE).pill}`}>
                    {(STATUS_CONFIG[selectedQuestData.status] || STATUS_CONFIG.ACTIVE).label}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Description</label>
              <textarea
                value={editFields.description || ''}
                onChange={(e) => setEditFields(p => ({ ...p, description: e.target.value }))}
                onBlur={() => {
                  if (editFields.description !== (selectedQuestData.description || '')) {
                    handleUpdateQuest({ description: editFields.description });
                  }
                }}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                placeholder="Description de la quete..."
              />
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Etapes</h3>
                {selectedQuestData.steps && selectedQuestData.steps.length > 0 && (
                  <span className="text-gray-400 text-xs">
                    {selectedQuestData.steps.filter(s => s.isCompleted).length}/{selectedQuestData.steps.length} completees
                  </span>
                )}
              </div>
              {selectedQuestData.steps && selectedQuestData.steps.length > 0 && (
                <>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: (selectedQuestData.steps.filter(s => s.isCompleted).length / selectedQuestData.steps.length * 100) + '%' }}
                    />
                  </div>
                  <div className="space-y-1 mb-3">
                    {selectedQuestData.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => handleToggleStep(step.id)}
                          className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition ${
                            step.isCompleted
                              ? 'bg-green-600 border-green-500 text-white'
                              : 'border-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {step.isCompleted && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${step.isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
                            {step.title}
                          </span>
                          {step.isCompleted && step.completedAt && (
                            <span className="text-[10px] text-gray-600 ml-2">
                              {new Date(step.completedAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                  placeholder="Nouvelle etape..."
                  className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  onClick={handleAddStep}
                  disabled={!newStepTitle.trim()}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg border border-gray-600 transition"
                >
                  Ajouter
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Assignations</h3>
              </div>
              {selectedQuestData.assignments && selectedQuestData.assignments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedQuestData.assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 px-2 py-1 bg-gray-700 rounded-lg">
                      {a.entityAvatar ? (
                        <img src={toFullUrl(a.entityAvatar)} alt={a.entityName} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 text-[10px] font-bold">
                          {(a.entityName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white text-sm">{a.entityName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ENTITY_TYPE_COLORS[a.entityType] || 'bg-gray-600 text-gray-300'}`}>
                        {ENTITY_TYPE_LABELS[a.entityType] || a.entityType}
                      </span>
                      <button
                        onClick={() => handleRemoveAssignment(a.id)}
                        className="text-gray-500 hover:text-red-400 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setAssignDropdownOpen(!assignDropdownOpen)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg border border-gray-600 transition"
                >
                  + Assigner une entite
                </button>
                {assignDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
                    {characters.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-gray-750">Personnages</p>
                        {characters.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleAddAssignment('character', c)}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition flex items-center gap-2"
                          >
                            {c.avatar ? (
                              <img src={toFullUrl(c.avatar)} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[9px] text-gray-400 font-bold">{c.name.charAt(0).toUpperCase()}</div>
                            )}
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {npcs.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-gray-750">PNJ</p>
                        {npcs.map(n => (
                          <button
                            key={n.id}
                            onClick={() => handleAddAssignment('npc', n)}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition flex items-center gap-2"
                          >
                            {n.avatar ? (
                              <img src={toFullUrl(n.avatar)} alt={n.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[9px] text-gray-400 font-bold">{n.name.charAt(0).toUpperCase()}</div>
                            )}
                            {n.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {monsters.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider bg-gray-750">Monstres</p>
                        {monsters.map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleAddAssignment('monster', m)}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition flex items-center gap-2"
                          >
                            {m.image ? (
                              <img src={toFullUrl(m.image)} alt={m.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[9px] text-gray-400 font-bold">{m.name.charAt(0).toUpperCase()}</div>
                            )}
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {characters.length === 0 && npcs.length === 0 && monsters.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-500">Aucune entite disponible.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Recompenses</h3>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Recompense en XP</label>
                <input
                  type="number"
                  min="0"
                  value={editFields.xpReward ?? ''}
                  onChange={(e) => setEditFields(p => ({ ...p, xpReward: e.target.value }))}
                  onBlur={() => {
                    const val = editFields.xpReward !== '' ? parseInt(editFields.xpReward) : null;
                    if (val !== (selectedQuestData.xpReward ?? null)) {
                      handleUpdateQuest({ xpReward: val });
                    }
                  }}
                  className="w-32 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                  placeholder="0"
                />
              </div>
              {selectedQuestData.rewards && selectedQuestData.rewards.length > 0 && (
                <div className="space-y-1 mb-3">
                  {selectedQuestData.rewards.map(r => (
                    <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-700 rounded-lg group">
                      {r.itemImage ? (
                        <img src={toFullUrl(r.itemImage)} alt={r.itemName} className="w-7 h-7 rounded object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-gray-600 flex items-center justify-center text-gray-400 text-[10px] font-bold">
                          {(r.itemName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white text-sm flex-1">{r.itemName}</span>
                      <span className="text-gray-400 text-xs">x{r.quantity || 1}</span>
                      <button
                        onClick={() => handleRemoveReward(r.id)}
                        className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={rewardQuantity}
                  onChange={(e) => setRewardQuantity(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  onClick={() => setRewardDropdownOpen(!rewardDropdownOpen)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg border border-gray-600 transition"
                >
                  + Ajouter un objet
                </button>
                {rewardDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
                    {items.length > 0 ? (
                      items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleAddReward(item)}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition flex items-center gap-2"
                        >
                          {item.image ? (
                            <img src={toFullUrl(item.image)} alt={item.name} className="w-5 h-5 rounded object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center text-[9px] text-gray-400 font-bold">{item.name.charAt(0).toUpperCase()}</div>
                          )}
                          {item.name}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-xs text-gray-500">Aucun objet disponible.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold text-sm mb-3">Quete liee</h3>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Quete parente</label>
                <select
                  value={editFields.parentQuestId || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setEditFields(p => ({ ...p, parentQuestId: val || '' }));
                    handleUpdateQuest({ parentQuestId: val });
                  }}
                  className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">Aucune</option>
                  {otherQuests.map(q => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
              </div>
              {childQuests.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Sous-quetes</label>
                  <div className="space-y-1">
                    {childQuests.map(cq => {
                      const cqStatus = STATUS_CONFIG[cq.status] || STATUS_CONFIG.ACTIVE;
                      return (
                        <button
                          key={cq.id}
                          onClick={() => selectQuest(cq)}
                          className="w-full text-left px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-white hover:bg-gray-600 transition flex items-center gap-2"
                        >
                          <span className="flex-1 truncate">{cq.title}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cqStatus.pill}`}>
                            {cqStatus.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold text-sm mb-2">Date limite</h3>
              <input
                type="text"
                value={editFields.deadline || ''}
                onChange={(e) => setEditFields(p => ({ ...p, deadline: e.target.value }))}
                onBlur={() => {
                  if (editFields.deadline !== (selectedQuestData.deadline || '')) {
                    handleUpdateQuest({ deadline: editFields.deadline || null });
                  }
                }}
                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                placeholder="Ex: Avant la pleine lune, Session 12..."
              />
            </div>

            <div className="bg-gray-800 rounded-xl border border-amber-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-white font-semibold text-sm">Notes MJ</h3>
                <span className="px-1.5 py-0.5 bg-amber-900 text-amber-300 text-[10px] font-semibold rounded">Prive</span>
              </div>
              <textarea
                value={editFields.gmNotes || ''}
                onChange={(e) => setEditFields(p => ({ ...p, gmNotes: e.target.value }))}
                onBlur={() => {
                  if (editFields.gmNotes !== (selectedQuestData.gmNotes || '')) {
                    handleUpdateQuest({ gmNotes: editFields.gmNotes });
                  }
                }}
                rows={3}
                className="w-full px-3 py-2 bg-gray-900 border border-amber-700/30 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500 transition resize-none"
                placeholder="Notes privees pour le MJ..."
              />
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold text-sm mb-3">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selectedQuestData.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={handleCompleteQuest}
                      className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg font-semibold transition"
                    >
                      Terminer la quete
                    </button>
                    <button
                      onClick={handleFailQuest}
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg font-semibold transition"
                    >
                      Echouer la quete
                    </button>
                  </>
                )}
                {selectedQuestData.status !== 'ACTIVE' && (
                  <button
                    onClick={handleReactivateQuest}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-sm rounded-lg font-semibold transition"
                  >
                    Reactiver la quete
                  </button>
                )}
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-sm">Confirmer la suppression ?</span>
                    <button
                      onClick={handleDeleteQuest}
                      className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg font-semibold transition"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-2 bg-gray-700 hover:bg-red-900 text-gray-400 hover:text-red-300 text-sm rounded-lg transition"
                  >
                    Supprimer la quete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
