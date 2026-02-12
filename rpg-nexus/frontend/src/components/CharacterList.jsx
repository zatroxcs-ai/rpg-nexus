// 📍 Fichier : frontend/src/components/CharacterList.jsx
// 🎯 Rôle : Affiche la liste des personnages avec modal de création/édition
// 💡 Distingue les PNJ et les personnages de joueurs

import { useState, useEffect } from 'react';
import { characterAPI } from '../services/api';
import CharacterForm from './CharacterForm';
import CharacterCard from './CharacterCard';

export default function CharacterList({ gameId, currentUserId, isGameMaster }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);

  useEffect(() => {
    loadCharacters();
  }, [gameId]);

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

  const handleCreate = async (characterData) => {
    try {
      await characterAPI.create(characterData);
      await loadCharacters();
      setShowModal(false);
      setEditingCharacter(null);
    } catch (error) {
      console.error('Erreur création personnage:', error);
      throw error;
    }
  };

  const handleEdit = (character) => {
    setEditingCharacter(character);
    setShowModal(true);
  };

  const handleUpdate = async (characterData) => {
    try {
      await characterAPI.update(editingCharacter.id, characterData);
      await loadCharacters();
      setShowModal(false);
      setEditingCharacter(null);
    } catch (error) {
      console.error('Erreur modification personnage:', error);
      throw error;
    }
  };

  const handleDelete = async (characterId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce personnage ?')) {
      return;
    }

    try {
      await characterAPI.delete(characterId);
      await loadCharacters();
    } catch (error) {
      console.error('Erreur suppression personnage:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const openCreateModal = () => {
    setEditingCharacter(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCharacter(null);
  };

  // Vérifie si l'utilisateur a déjà un personnage
  const userCharacter = characters.find((c) => c.ownerId === currentUserId);
  const canCreateCharacter = isGameMaster || !userCharacter;

  // Sépare les PNJ et les personnages de joueurs
  const npcs = characters.filter((c) => !c.ownerId);
  const playerCharacters = characters.filter((c) => c.ownerId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement des personnages...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* En-tête avec bouton créer */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">👤 Personnages</h2>
        
        {canCreateCharacter && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <span>➕</span>
            <span>{isGameMaster ? 'Nouveau Personnage' : 'Créer Mon Personnage'}</span>
          </button>
        )}
        
        {!canCreateCharacter && !isGameMaster && (
          <div className="text-sm text-gray-400">
            Vous avez déjà un personnage dans cette partie
          </div>
        )}
      </div>

      {/* Liste des personnages de joueurs */}
      {playerCharacters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            🎭 Personnages de Joueurs
            <span className="text-sm text-gray-400 font-normal">({playerCharacters.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playerCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canEdit={
                  isGameMaster || character.ownerId === currentUserId
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Liste des PNJ */}
      {npcs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            🎪 Personnages Non-Joueurs (PNJ)
            <span className="text-sm text-gray-400 font-normal">({npcs.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {npcs.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canEdit={isGameMaster}
              />
            ))}
          </div>
        </div>
      )}

      {/* Message si aucun personnage */}
      {characters.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎭</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Aucun personnage pour le moment
          </h3>
          <p className="text-gray-400 mb-4">
            {isGameMaster
              ? 'Créez des personnages pour vos joueurs ou des PNJ pour votre aventure'
              : 'Créez votre personnage pour commencer à jouer'}
          </p>
        </div>
      )}

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingCharacter ? '✏️ Modifier le Personnage' : '➕ Créer un Personnage'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
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
