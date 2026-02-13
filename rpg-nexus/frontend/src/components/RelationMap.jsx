import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import useDataSync from '../hooks/useDataSync';

const RELATION_TYPES = [
  { id: 'allie', label: 'Allie', color: '#4ade80', bg: 'bg-green-900', text: 'text-green-400' },
  { id: 'ennemi', label: 'Ennemi', color: '#f87171', bg: 'bg-red-900', text: 'text-red-400' },
  { id: 'neutre', label: 'Neutre', color: '#9ca3af', bg: 'bg-gray-700', text: 'text-gray-400' },
  { id: 'connaissance', label: 'Connaissance', color: '#60a5fa', bg: 'bg-blue-900', text: 'text-blue-400' },
  { id: 'famille', label: 'Famille', color: '#c084fc', bg: 'bg-purple-900', text: 'text-purple-400' },
  { id: 'commerce', label: 'Commerce', color: '#fbbf24', bg: 'bg-amber-900', text: 'text-amber-400' },
];

const ENTITY_COLORS = {
  character: { bg: '#1e3a5f', border: '#3b82f6', label: 'Personnage' },
  monster: { bg: '#5f1e1e', border: '#ef4444', label: 'Monstre' },
  npc: { bg: '#1e5f3a', border: '#10b981', label: 'PNJ' },
};

const toFullUrl = (url) => !url ? null : url.startsWith('http') ? url : 'http://localhost:3000' + url;

export default function RelationMap({ gameId, isGameMaster }) {
  const [relations, setRelations] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRelation, setEditingRelation] = useState(null);
  const [form, setForm] = useState({ sourceType: '', sourceId: '', targetType: '', targetId: '', type: 'neutre', label: '', notes: '' });
  const [nodePositions, setNodePositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, [gameId]);

  const syncRelations = useCallback(() => { loadAll(); }, [gameId]);
  useDataSync('relation', syncRelations);

  const loadAll = async () => {
    try {
      const [relRes, charRes, monRes, npcRes] = await Promise.all([
        api.get('/relation/game/' + gameId),
        api.get('/character/game/' + gameId),
        api.get('/monster/game/' + gameId),
        api.get('/npc/game/' + gameId),
      ]);
      setRelations(Array.isArray(relRes.data) ? relRes.data : []);
      setCharacters(Array.isArray(charRes.data) ? charRes.data : []);
      setMonsters(Array.isArray(monRes.data) ? monRes.data : []);
      setNpcs(Array.isArray(npcRes.data) ? npcRes.data : []);
    } catch (e) {
      console.error('Failed to load relations:', e);
    } finally {
      setLoading(false);
    }
  };

  const allEntities = [
    ...characters.map(c => ({ ...c, entityType: 'character', avatar: c.avatarUrl || c.avatar })),
    ...monsters.map(m => ({ ...m, entityType: 'monster', avatar: m.image })),
    ...npcs.map(n => ({ ...n, entityType: 'npc', avatar: n.avatar })),
  ];

  const getEntityById = (type, id) => allEntities.find(e => e.entityType === type && e.id === id);

  const usedEntityIds = new Set();
  relations.forEach(r => {
    usedEntityIds.add(r.sourceType + ':' + r.sourceId);
    usedEntityIds.add(r.targetType + ':' + r.targetId);
  });

  const nodesInGraph = allEntities.filter(e => usedEntityIds.has(e.entityType + ':' + e.id));

  useEffect(() => {
    if (nodesInGraph.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    const existing = { ...nodePositions };
    let changed = false;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;
    nodesInGraph.forEach((node, i) => {
      const key = node.entityType + ':' + node.id;
      if (!existing[key]) {
        const angle = (2 * Math.PI * i) / nodesInGraph.length - Math.PI / 2;
        existing[key] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
        changed = true;
      }
    });
    if (changed) setNodePositions(existing);
  }, [nodesInGraph.length]);

  const handleMouseDown = (key, e) => {
    e.stopPropagation();
    setDragging(key);
    setSelectedNode(key);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setNodePositions(prev => ({
      ...prev,
      [dragging]: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const openCreate = () => {
    setForm({ sourceType: '', sourceId: '', targetType: '', targetId: '', type: 'neutre', label: '', notes: '' });
    setEditingRelation(null);
    setShowForm(true);
  };

  const openEdit = (rel) => {
    setForm({
      sourceType: rel.sourceType,
      sourceId: rel.sourceId,
      targetType: rel.targetType,
      targetId: rel.targetId,
      type: rel.type,
      label: rel.label || '',
      notes: rel.notes || '',
    });
    setEditingRelation(rel);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.sourceId || !form.targetId) return;
    const sourceEntity = getEntityById(form.sourceType, form.sourceId);
    const targetEntity = getEntityById(form.targetType, form.targetId);
    if (!sourceEntity || !targetEntity) return;

    const payload = {
      ...form,
      sourceName: sourceEntity.name,
      targetName: targetEntity.name,
    };

    try {
      if (editingRelation) {
        await api.put('/relation/' + editingRelation.id, payload);
      } else {
        await api.post('/relation/game/' + gameId, payload);
      }
      setShowForm(false);
      await loadAll();
    } catch (e) {
      console.error('Failed to save relation:', e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete('/relation/' + id);
      setDeleteConfirmId(null);
      await loadAll();
    } catch (e) {
      console.error('Failed to delete relation:', e);
    }
  };

  const getRelationColor = (type) => RELATION_TYPES.find(r => r.id === type)?.color || '#9ca3af';
  const getRelationLabel = (type) => RELATION_TYPES.find(r => r.id === type)?.label || type;

  const filteredRelations = relations.filter(r => {
    if (filterType && r.type !== filterType) return false;
    if (filterEntity) {
      const key = filterEntity;
      const sKey = r.sourceType + ':' + r.sourceId;
      const tKey = r.targetType + ':' + r.targetId;
      if (sKey !== key && tKey !== key) return false;
    }
    return true;
  });

  const getEntitiesByType = (type) => {
    if (type === 'character') return characters;
    if (type === 'monster') return monsters;
    if (type === 'npc') return npcs;
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xl">
        Chargement des relations...
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-xl">Carte des Relations</h2>
          {isGameMaster && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition font-semibold"
            >
              + Nouvelle Relation
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tous les types</option>
            {RELATION_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Toutes les entites</option>
            {allEntities.map(e => (
              <option key={e.entityType + ':' + e.id} value={e.entityType + ':' + e.id}>
                {ENTITY_COLORS[e.entityType]?.label} - {e.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 ml-auto">
            {RELATION_TYPES.map(t => (
              <span key={t.id} className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ cursor: dragging ? 'grabbing' : 'default' }}
          onClick={() => setSelectedNode(null)}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {filteredRelations.map((rel) => {
              const sKey = rel.sourceType + ':' + rel.sourceId;
              const tKey = rel.targetType + ':' + rel.targetId;
              const sp = nodePositions[sKey];
              const tp = nodePositions[tKey];
              if (!sp || !tp) return null;
              const color = getRelationColor(rel.type);
              const mx = (sp.x + tp.x) / 2;
              const my = (sp.y + tp.y) / 2;
              return (
                <g key={rel.id}>
                  <line x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y} stroke={color} strokeWidth="2" strokeOpacity="0.6" />
                  <circle cx={mx} cy={my} r="4" fill={color} />
                </g>
              );
            })}
          </svg>

          {nodesInGraph.map((node) => {
            const key = node.entityType + ':' + node.id;
            const pos = nodePositions[key];
            if (!pos) return null;
            const ec = ENTITY_COLORS[node.entityType] || ENTITY_COLORS.npc;
            const isSelected = selectedNode === key;
            const nodeRelations = filteredRelations.filter(r =>
              (r.sourceType + ':' + r.sourceId === key) || (r.targetType + ':' + r.targetId === key)
            );
            return (
              <div
                key={key}
                className="absolute flex flex-col items-center"
                style={{
                  left: pos.x - 32,
                  top: pos.y - 32,
                  zIndex: isSelected ? 20 : 10,
                  cursor: 'grab',
                  userSelect: 'none',
                }}
                onMouseDown={(e) => handleMouseDown(key, e)}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center border-3 shadow-lg overflow-hidden"
                  style={{
                    backgroundColor: ec.bg,
                    borderColor: ec.border,
                    borderWidth: isSelected ? '3px' : '2px',
                    boxShadow: isSelected ? `0 0 12px ${ec.border}` : 'none',
                  }}
                >
                  {node.avatar ? (
                    <img src={toFullUrl(node.avatar)} alt={node.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-lg font-bold">{node.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="mt-1 text-xs text-white font-semibold text-center max-w-20 truncate bg-gray-800 bg-opacity-80 px-1.5 py-0.5 rounded">
                  {node.name}
                </span>
                {isSelected && nodeRelations.length > 0 && (
                  <div className="absolute top-full mt-6 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl z-30 min-w-48">
                    {nodeRelations.map(rel => {
                      const isSource = rel.sourceType + ':' + rel.sourceId === key;
                      const otherName = isSource ? rel.targetName : rel.sourceName;
                      return (
                        <div key={rel.id} className="flex items-center gap-2 py-1 text-xs">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getRelationColor(rel.type) }} />
                          <span className="text-gray-400">{getRelationLabel(rel.type)}</span>
                          <span className="text-white">{otherName}</span>
                          {rel.label && <span className="text-gray-500 italic">({rel.label})</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {nodesInGraph.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg">Aucune relation creee.</p>
              <p className="text-sm mt-2">Creez une relation pour voir apparaitre la carte.</p>
            </div>
          )}
        </div>

        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-white font-semibold text-sm">Liste des relations ({filteredRelations.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredRelations.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-4">Aucune relation.</p>
            ) : (
              filteredRelations.map(rel => (
                <div
                  key={rel.id}
                  className="bg-gray-700 rounded-lg p-3 border border-gray-600"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getRelationColor(rel.type) }} />
                    <span className="text-white text-sm font-semibold">{rel.sourceName}</span>
                    <span className="text-gray-500 text-xs">-</span>
                    <span className="text-white text-sm font-semibold">{rel.targetName}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${RELATION_TYPES.find(t => t.id === rel.type)?.bg || 'bg-gray-700'} ${RELATION_TYPES.find(t => t.id === rel.type)?.text || 'text-gray-400'}`}>
                      {getRelationLabel(rel.type)}
                    </span>
                    {rel.label && <span className="text-gray-400 text-xs italic">{rel.label}</span>}
                  </div>
                  {rel.notes && <p className="text-gray-500 text-xs line-clamp-2 mt-1">{rel.notes}</p>}
                  {isGameMaster && (
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => openEdit(rel)}
                        className="px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 bg-gray-600 hover:bg-gray-500 rounded transition"
                      >
                        Modifier
                      </button>
                      {deleteConfirmId === rel.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(rel.id)}
                            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-red-900 bg-opacity-30 hover:bg-opacity-50 rounded transition font-semibold"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-600 hover:bg-gray-500 rounded transition"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(rel.id)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-gray-600 hover:bg-gray-500 rounded transition"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-white">
                {editingRelation ? 'Modifier la relation' : 'Creer une relation'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-2xl leading-none">x</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.sourceType}
                    onChange={(e) => setForm(p => ({ ...p, sourceType: e.target.value, sourceId: '' }))}
                    disabled={!!editingRelation}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Type...</option>
                    <option value="character">Personnage</option>
                    <option value="monster">Monstre</option>
                    <option value="npc">PNJ</option>
                  </select>
                  <select
                    value={form.sourceId}
                    onChange={(e) => setForm(p => ({ ...p, sourceId: e.target.value }))}
                    disabled={!form.sourceType || !!editingRelation}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Choisir...</option>
                    {getEntitiesByType(form.sourceType).map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Cible</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.targetType}
                    onChange={(e) => setForm(p => ({ ...p, targetType: e.target.value, targetId: '' }))}
                    disabled={!!editingRelation}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Type...</option>
                    <option value="character">Personnage</option>
                    <option value="monster">Monstre</option>
                    <option value="npc">PNJ</option>
                  </select>
                  <select
                    value={form.targetId}
                    onChange={(e) => setForm(p => ({ ...p, targetId: e.target.value }))}
                    disabled={!form.targetType || !!editingRelation}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Choisir...</option>
                    {getEntitiesByType(form.targetType).map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Type de relation</label>
                <div className="grid grid-cols-3 gap-2">
                  {RELATION_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, type: t.id }))}
                      className={`p-2 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 ${
                        form.type === t.id
                          ? 'border-white bg-opacity-40 text-white ' + t.bg
                          : 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Etiquette (optionnel)</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm(p => ({ ...p, label: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Frere, Mentor, Rival..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notes (optionnel)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none"
                  placeholder="Details sur cette relation..."
                />
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
                disabled={!form.sourceId || !form.targetId}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition font-semibold text-sm"
              >
                {editingRelation ? 'Sauvegarder' : 'Creer la relation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
