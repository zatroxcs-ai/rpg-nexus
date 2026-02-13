import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useDataSync from '../hooks/useDataSync';

const PRIORITY_STYLES = {
  MAIN: { bg: 'bg-amber-900/30', border: 'border-amber-600', text: 'text-amber-400', label: 'Principale' },
  SECONDARY: { bg: 'bg-indigo-900/30', border: 'border-indigo-600', text: 'text-indigo-400', label: 'Secondaire' },
  HIDDEN: { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-400', label: 'Cachee' },
};

const STATUS_STYLES = {
  ACTIVE: { bg: 'bg-green-900/40', text: 'text-green-400', label: 'Active' },
  COMPLETED: { bg: 'bg-blue-900/40', text: 'text-blue-400', label: 'Terminee' },
  FAILED: { bg: 'bg-red-900/40', text: 'text-red-400', label: 'Echouee' },
};

export default function PlayerQuestView({ gameId }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadQuests();
  }, [gameId]);

  const syncQuests = useCallback(() => { loadQuests(); }, [gameId]);
  useDataSync('quest', syncQuests);

  const loadQuests = async () => {
    try {
      const res = await api.get(`/quest/game/${gameId}/player`);
      setQuests(res.data || []);
    } catch {
      setQuests([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'ALL' ? quests : quests.filter(q => q.status === filter);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>;
  }

  if (quests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
        <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-lg font-semibold">Aucune quete</p>
        <p className="text-sm text-gray-500 mt-1">Le MJ ne vous a pas encore assigne de quetes.</p>
      </div>
    );
  }

  if (selectedQuest) {
    const q = selectedQuest;
    const pStyle = PRIORITY_STYLES[q.priority] || PRIORITY_STYLES.SECONDARY;
    const sStyle = STATUS_STYLES[q.status] || STATUS_STYLES.ACTIVE;
    const steps = q.steps || [];
    const completedSteps = steps.filter(s => s.isCompleted).length;
    const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <button
            onClick={() => setSelectedQuest(null)}
            className="min-h-[44px] px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition"
          >
            Retour
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold truncate">{q.title}</h2>
            <div className="flex gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded ${pStyle.bg} ${pStyle.text} border ${pStyle.border}`}>{pStyle.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${sStyle.bg} ${sStyle.text}`}>{sStyle.label}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {q.description && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{q.description}</p>
            </div>
          )}

          {steps.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Etapes</h3>
                <span className="text-xs text-gray-400">{completedSteps}/{steps.length}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="space-y-2">
                {steps.sort((a, b) => a.sortOrder - b.sortOrder).map(step => (
                  <div key={step.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-900/50">
                    <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      step.isCompleted ? 'bg-green-600 border-green-600' : 'border-gray-500'
                    }`}>
                      {step.isCompleted && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${step.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>{step.title}</p>
                      {step.description && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(q.assignments || []).length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold text-sm mb-3">Participants</h3>
              <div className="flex flex-wrap gap-2">
                {q.assignments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
                    {a.entityAvatar ? (
                      <img src={a.entityAvatar.startsWith('http') ? a.entityAvatar : `http://localhost:3000${a.entityAvatar}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs text-gray-400">
                        {a.entityName?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-white text-sm">{a.entityName}</span>
                    <span className="text-xs text-gray-500">
                      {a.entityType === 'character' ? 'PJ' : a.entityType === 'npc' ? 'PNJ' : 'Monstre'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {((q.rewards || []).length > 0 || q.xpReward) && (
            <div className="bg-gray-800 rounded-xl p-4 border border-amber-900/50">
              <h3 className="text-amber-400 font-semibold text-sm mb-3">Recompenses</h3>
              {q.xpReward > 0 && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-900/20 rounded-lg">
                  <span className="text-amber-400 font-bold">{q.xpReward} XP</span>
                </div>
              )}
              {(q.rewards || []).map(r => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg mb-1">
                  {r.itemImage && (
                    <img src={r.itemImage.startsWith('http') ? r.itemImage : `http://localhost:3000${r.itemImage}`} alt="" className="w-8 h-8 rounded object-cover" />
                  )}
                  <span className="text-white text-sm">{r.itemName}</span>
                  {r.quantity > 1 && <span className="text-gray-400 text-xs">x{r.quantity}</span>}
                </div>
              ))}
            </div>
          )}

          {q.deadline && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold text-sm mb-1">Date limite</h3>
              <p className="text-gray-400 text-sm">{q.deadline}</p>
            </div>
          )}

          {q.parentQuest && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold text-sm mb-1">Quete principale</h3>
              <p className="text-indigo-400 text-sm">{q.parentQuest.title}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const filters = [
    { id: 'ALL', label: 'Toutes' },
    { id: 'ACTIVE', label: 'Actives' },
    { id: 'COMPLETED', label: 'Terminees' },
    { id: 'FAILED', label: 'Echouees' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex gap-2 overflow-x-auto">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                filter === f.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune quete dans cette categorie.</p>
        ) : (
          filtered.map(q => {
            const pStyle = PRIORITY_STYLES[q.priority] || PRIORITY_STYLES.SECONDARY;
            const sStyle = STATUS_STYLES[q.status] || STATUS_STYLES.ACTIVE;
            const steps = q.steps || [];
            const completedSteps = steps.filter(s => s.isCompleted).length;
            const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

            return (
              <button
                key={q.id}
                onClick={() => setSelectedQuest(q)}
                className={`w-full text-left p-4 rounded-xl border transition min-h-[44px] ${pStyle.bg} ${pStyle.border} hover:brightness-110`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-bold text-sm truncate">{q.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${sStyle.bg} ${sStyle.text}`}>{sStyle.label}</span>
                </div>
                {steps.length > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{completedSteps}/{steps.length} etapes</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {(q.assignments || []).length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {q.assignments.slice(0, 4).map(a => (
                      <div key={a.id} className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-gray-300 border border-gray-500">
                        {a.entityName?.[0]?.toUpperCase()}
                      </div>
                    ))}
                    {q.assignments.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-gray-400">
                        +{q.assignments.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
