import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { characterAPI } from '../services/api';
import CharacterForm from './CharacterForm';
import CharacterCard from './CharacterCard';
import useDataSync from '../hooks/useDataSync';

export default function CharacterList({ gameId, currentUserId, isGameMaster }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [entityItems, setEntityItems] = useState({});

  useEffect(() => {
    loadCharacters();
  }, [gameId]);

  const syncChars = useCallback(() => { loadCharacters(); }, [gameId]);
  useDataSync('character', syncChars);

  useEffect(() => {
    if (characters.length > 0) {
      loadAllCharacterItems(characters);
    }
  }, [characters]);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      const data = await characterAPI.getByGame(gameId);
      setCharacters(data);
    } catch (error) {
      console.error('Erreur chargement personnages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCharacterItems = async (charList) => {
    const map = {};
    for (const c of charList) {
      try {
        const res = await api.get('/item/entity/character/' + c.id);
        map[c.id] = Array.isArray(res.data) ? res.data : [];
      } catch (e) { map[c.id] = []; }
    }
    setEntityItems(map);
  };

  const handleCreate = async (characterData) => {
    await characterAPI.create(characterData);
    await loadCharacters();
    setShowModal(false);
    setEditingCharacter(null);
  };

  const handleEdit = (character) => {
    setEditingCharacter(character);
    setShowModal(true);
  };

  const handleUpdate = async (characterData) => {
    await characterAPI.update(editingCharacter.id, characterData);
    await loadCharacters();
    setShowModal(false);
    setEditingCharacter(null);
  };

  const handleDelete = async (characterId) => {
    try {
      await characterAPI.delete(characterId);
      setDeleteConfirmId(null);
      await loadCharacters();
    } catch (error) {
      console.error('Erreur suppression personnage:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCharacter(null);
  };

  const userCharacter = characters.find((c) => c.ownerId === currentUserId);
  const canCreateCharacter = isGameMaster || !userCharacter;

  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const playerCharacters = filtered.filter(c => c.ownerId);
  const npcs = filtered.filter(c => !c.ownerId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xl">
        Chargement des personnages...
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-xl">Personnages</h2>
          <div className="flex items-center gap-3">
            {!canCreateCharacter && !isGameMaster && (
              <span className="text-sm text-gray-400">Vous avez deja un personnage</span>
            )}
            {canCreateCharacter && (
              <button
                onClick={() => { setEditingCharacter(null); setShowModal(true); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition font-semibold"
              >
                + Nouveau personnage
              </button>
            )}
          </div>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un personnage..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-lg">{characters.length === 0 ? 'Aucun personnage pour le moment.' : 'Aucun personnage ne correspond.'}</p>
            {characters.length === 0 && (
              <p className="text-sm mt-2">
                {isGameMaster
                  ? 'Creez des personnages pour vos joueurs ou des PNJ.'
                  : 'Creez votre personnage pour commencer a jouer.'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {playerCharacters.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Personnages de joueurs ({playerCharacters.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {playerCharacters.map(character => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      items={entityItems[character.id] || []}
                      onEdit={handleEdit}
                      onDelete={(id) => setDeleteConfirmId(id)}
                      canEdit={isGameMaster || character.ownerId === currentUserId}
                      deleteConfirmId={deleteConfirmId}
                      onDeleteConfirm={handleDelete}
                      onDeleteCancel={() => setDeleteConfirmId(null)}
                    />
                  ))}
                </div>
              </div>
            )}
            {npcs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Personnages non-joueurs ({npcs.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {npcs.map(character => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      items={entityItems[character.id] || []}
                      onEdit={handleEdit}
                      onDelete={(id) => setDeleteConfirmId(id)}
                      canEdit={isGameMaster}
                      deleteConfirmId={deleteConfirmId}
                      onDeleteConfirm={handleDelete}
                      onDeleteCancel={() => setDeleteConfirmId(null)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-white">
                {editingCharacter ? 'Modifier le personnage' : 'Creer un personnage'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white text-2xl leading-none">x</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <CharacterForm
                gameId={gameId}
                character={editingCharacter}
                onSubmit={editingCharacter ? handleUpdate : handleCreate}
                onCancel={closeModal}
                isGameMaster={isGameMaster}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
