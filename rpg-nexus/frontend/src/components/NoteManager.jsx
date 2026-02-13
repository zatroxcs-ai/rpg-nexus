import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useDataSync from '../hooks/useDataSync';

const CATEGORIES = ['session', 'lore', 'recap', 'quest', 'timeline', 'other'];

const CATEGORY_STYLES = {
  session: { bg: 'bg-blue-900/40', text: 'text-blue-300', border: 'border-blue-500', pill: 'bg-blue-800 text-blue-200' },
  lore: { bg: 'bg-purple-900/40', text: 'text-purple-300', border: 'border-purple-500', pill: 'bg-purple-800 text-purple-200' },
  recap: { bg: 'bg-green-900/40', text: 'text-green-300', border: 'border-green-500', pill: 'bg-green-800 text-green-200' },
  quest: { bg: 'bg-amber-900/40', text: 'text-amber-300', border: 'border-amber-500', pill: 'bg-amber-800 text-amber-200' },
  timeline: { bg: 'bg-indigo-900/40', text: 'text-indigo-300', border: 'border-indigo-500', pill: 'bg-indigo-800 text-indigo-200' },
  other: { bg: 'bg-gray-700/40', text: 'text-gray-300', border: 'border-gray-500', pill: 'bg-gray-700 text-gray-300' },
};

const CATEGORY_LABELS = {
  session: 'Session',
  lore: 'Lore',
  recap: 'Recap',
  quest: 'Quest',
  timeline: 'Timeline',
  other: 'Other',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NoteManager({ gameId, isGameMaster }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [createForm, setCreateForm] = useState({ title: '', content: '', category: 'session', gameDate: '', participants: [] });
  const [editForm, setEditForm] = useState({ title: '', content: '', category: 'session', gameDate: '', participants: [] });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [characters, setCharacters] = useState([]);
  const [npcs, setNpcs] = useState([]);

  useEffect(() => {
    loadNotes();
    if (isGameMaster) {
      api.get('/character/game/' + gameId).then(r => setCharacters(r.data || [])).catch(() => {});
      api.get('/npc/game/' + gameId).then(r => setNpcs(r.data || [])).catch(() => {});
    }
  }, [gameId]);

  const syncNotes = useCallback(() => { loadNotes(); }, [gameId]);
  useDataSync('note', syncNotes);

  const loadNotes = async () => {
    try {
      const res = await api.get('/note/game/' + gameId);
      setNotes(res.data);
    } catch (e) {
      console.error('Error loading notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/note/game/' + gameId, {
        title: createForm.title,
        content: createForm.content,
        category: createForm.category,
        gameDate: createForm.gameDate || undefined,
        participants: createForm.participants.length > 0 ? createForm.participants : undefined,
      });
      setCreateForm({ title: '', content: '', category: 'session', gameDate: '', participants: [] });
      setShowCreateForm(false);
      await loadNotes();
    } catch (e) {
      console.error('Error creating note:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingNote || !editForm.title.trim()) return;
    setSaving(true);
    try {
      await api.put('/note/' + editingNote.id, {
        title: editForm.title,
        content: editForm.content,
        category: editForm.category,
        gameDate: editForm.gameDate || undefined,
        participants: editForm.participants.length > 0 ? editForm.participants : undefined,
      });
      setEditingNote(null);
      await loadNotes();
    } catch (e) {
      console.error('Error updating note:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await api.delete('/note/' + noteId);
      setDeleteConfirmId(null);
      await loadNotes();
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await api.put('/note/' + note.id, { isPinned: !note.isPinned });
      await loadNotes();
    } catch (e) {
      console.error('Error toggling pin:', e);
    }
  };

  const openEdit = (note) => {
    setEditForm({ title: note.title, content: note.content || '', category: note.category, gameDate: note.gameDate || '', participants: note.participants || [] });
    setEditingNote(note);
  };

  const filteredNotes = notes
    .filter((n) => filterCategory === 'all' || n.category === filterCategory)
    .filter((n) => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">Campaign Journal</h2>
        <button
          onClick={() => { setShowCreateForm(true); setCreateForm({ title: '', content: '', category: 'session', gameDate: '', participants: [] }); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
        >
          + New Note
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              filterCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('cards')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          Cartes
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${viewMode === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          Timeline
        </button>
      </div>

      {sortedNotes.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No notes found</h3>
          <p className="text-gray-400 text-sm">
            {searchQuery || filterCategory !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Create your first note to get started.'}
          </p>
        </div>
      ) : (
        <>
        {viewMode === 'timeline' && (
          <div className="relative pl-8">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />
            {sortedNotes.map((note, idx) => {
              const style = CATEGORY_STYLES[note.category] || CATEGORY_STYLES.other;
              return (
                <div key={note.id} className="relative mb-6 ml-6">
                  <div className={`absolute -left-9 top-2 w-4 h-4 rounded-full border-2 border-gray-800 ${style.border.replace('border', 'bg')}`} />
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.pill}`}>
                        {CATEGORY_LABELS[note.category] || note.category}
                      </span>
                      {note.gameDate && (
                        <span className="text-indigo-400 text-xs font-semibold">{note.gameDate}</span>
                      )}
                      <span className="text-gray-500 text-xs ml-auto">{formatDate(note.updatedAt || note.createdAt)}</span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{note.title}</h3>
                    {note.content && (
                      <p className="text-gray-400 text-sm line-clamp-3">{note.content}</p>
                    )}
                    {note.participants && note.participants.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.participants.map((p, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                            {p.type === 'PNJ' ? '(PNJ) ' : ''}{p.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{note.author?.username || 'Unknown'}</span>
                      <button onClick={() => openEdit(note)} className="text-gray-500 hover:text-gray-300 ml-auto">Edit</button>
                      <button onClick={() => setDeleteConfirmId(note.id)} className="text-gray-500 hover:text-red-400">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedNotes.map((note) => {
            const style = CATEGORY_STYLES[note.category] || CATEGORY_STYLES.other;
            return (
              <div
                key={note.id}
                className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition flex flex-col`}
              >
                <div className={`h-1 ${style.border.replace('border', 'bg')}`} />
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {note.isPinned && (
                        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                      )}
                      <h3 className="text-white font-semibold truncate">{note.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${style.pill}`}>
                      {CATEGORY_LABELS[note.category] || note.category}
                    </span>
                  </div>

                  {note.content && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-3 flex-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {note.content}
                    </p>
                  )}
                  {!note.content && <div className="flex-1" />}
                  {note.participants && note.participants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {note.participants.map((p, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                          {p.type === 'PNJ' ? '(PNJ) ' : ''}{p.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-500">
                      <span className="text-gray-400">{note.author?.username || 'Unknown'}</span>
                      <span className="mx-1.5">-</span>
                      <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isGameMaster && (
                        <button
                          onClick={() => handleTogglePin(note)}
                          title={note.isPinned ? 'Unpin' : 'Pin'}
                          className={`p-1.5 rounded-lg transition ${
                            note.isPinned
                              ? 'text-amber-400 hover:bg-amber-900/30'
                              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(note)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(note.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
        </>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">New Note</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  placeholder="Note title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
              {createForm.category === 'timeline' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date (dans le jeu)</label>
                  <input
                    type="text"
                    value={createForm.gameDate}
                    onChange={(e) => setCreateForm(p => ({ ...p, gameDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="Ex: Jour 15 - Mois de Kythorn"
                  />
                </div>
              )}
              {isGameMaster && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Participants</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-700 rounded-lg border border-gray-600">
                    {[...characters.map(c => ({ id: c.id, name: c.name, type: 'PJ' })), ...npcs.map(n => ({ id: n.id, name: n.name, type: 'PNJ' }))].map(entity => {
                      const isSelected = (createForm.participants || []).some(p => p.id === entity.id);
                      return (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => {
                            setCreateForm(prev => ({
                              ...prev,
                              participants: isSelected
                                ? prev.participants.filter(p => p.id !== entity.id)
                                : [...(prev.participants || []), { id: entity.id, name: entity.name, type: entity.type }],
                            }));
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {entity.type === 'PNJ' ? '(PNJ) ' : ''}{entity.name}
                        </button>
                      );
                    })}
                    {characters.length === 0 && npcs.length === 0 && (
                      <span className="text-gray-500 text-xs">Aucun personnage ou PNJ</span>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                  placeholder="Write your note..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.title.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                {saving ? 'Saving...' : 'Create Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingNote && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Edit Note</h3>
              <button
                onClick={() => setEditingNote(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                  placeholder="Note title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
              {editForm.category === 'timeline' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date (dans le jeu)</label>
                  <input
                    type="text"
                    value={editForm.gameDate}
                    onChange={(e) => setEditForm(p => ({ ...p, gameDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                    placeholder="Ex: Jour 15 - Mois de Kythorn"
                  />
                </div>
              )}
              {isGameMaster && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Participants</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-700 rounded-lg border border-gray-600">
                    {[...characters.map(c => ({ id: c.id, name: c.name, type: 'PJ' })), ...npcs.map(n => ({ id: n.id, name: n.name, type: 'PNJ' }))].map(entity => {
                      const isSelected = (editForm.participants || []).some(p => p.id === entity.id);
                      return (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              participants: isSelected
                                ? prev.participants.filter(p => p.id !== entity.id)
                                : [...(prev.participants || []), { id: entity.id, name: entity.name, type: entity.type }],
                            }));
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {entity.type === 'PNJ' ? '(PNJ) ' : ''}{entity.name}
                        </button>
                      );
                    })}
                    {characters.length === 0 && npcs.length === 0 && (
                      <span className="text-gray-500 text-xs">Aucun personnage ou PNJ</span>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                  placeholder="Write your note..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
              <button
                onClick={() => setEditingNote(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving || !editForm.title.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl border border-gray-700 p-6 text-center">
            <svg className="w-12 h-12 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-bold text-white mb-2">Delete Note</h3>
            <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
