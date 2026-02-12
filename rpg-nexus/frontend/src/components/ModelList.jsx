// 📍 Fichier : frontend/src/components/ModelList.jsx
// 🎯 Rôle : Liste des templates de personnages
// 💡 Affiche, édite, supprime les CustomModels

import { useState, useEffect } from 'react';
import { customModelAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ModelBuilder from './ModelBuilder';

export default function ModelList({ gameId, ownerId }) {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  const isOwner = user?.id === ownerId;

  useEffect(() => {
    loadModels();
  }, [gameId]);

  const loadModels = async () => {
    try {
      const data = await customModelAPI.getByGame(gameId);
      setModels(data);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modelId) => {
    if (!confirm('Supprimer ce template ? Les personnages utilisant ce template ne seront pas affectés.')) return;

    try {
      await customModelAPI.delete(modelId);
      loadModels();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Chargement des templates...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          📋 Templates de Personnages
          {models.length > 0 && (
            <span className="text-sm bg-purple-600 px-3 py-1 rounded-full">
              {models.length}
            </span>
          )}
        </h2>
        {isOwner && (
          <button
            onClick={() => {
              setEditingModel(null);
              setShowBuilder(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition flex items-center gap-2"
          >
            <span>➕</span>
            <span>Créer un template</span>
          </button>
        )}
      </div>

      {/* Liste des templates */}
      {models.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-400 mb-4">Aucun template pour le moment</p>
          {isOwner && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Les templates définissent les stats et champs des personnages (Force, Race, etc.)
              </p>
              <button
                onClick={() => setShowBuilder(true)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded transition"
              >
                Créer le premier template
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-gray-800 rounded-lg p-4 border-2 border-gray-700 hover:border-purple-500 transition relative group"
            >
              {/* En-tête */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{model.name}</h3>
                  {model.description && (
                    <p className="text-sm text-gray-400 mt-1">{model.description}</p>
                  )}
                </div>
                
                {/* Boutons d'action (MJ uniquement) */}
                {isOwner && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => {
                        setEditingModel(model);
                        setShowBuilder(true);
                      }}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {/* Statistiques du template */}
              <div className="space-y-2">
                {/* Stats */}
                {model.schema?.stats && Object.keys(model.schema.stats).length > 0 && (
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-xs text-gray-400 mb-1">📊 Statistiques</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(model.schema.stats).map((statName) => (
                        <span key={statName} className="px-2 py-1 bg-gray-600 rounded text-xs">
                          {statName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fields */}
                {model.schema?.fields && Object.keys(model.schema.fields).length > 0 && (
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-xs text-gray-400 mb-1">📝 Champs</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(model.schema.fields).map((fieldName) => (
                        <span key={fieldName} className="px-2 py-1 bg-gray-600 rounded text-xs">
                          {fieldName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre de personnages utilisant ce template */}
              <div className="mt-3 text-xs text-gray-500">
                {model._count?.characters || 0} personnage(s)
              </div>

              {/* Bouton voir détails */}
              <button
                onClick={() => setSelectedModel(model)}
                className="mt-3 w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition text-sm"
              >
                Voir le détail
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Builder */}
      {showBuilder && (
        <ModelBuilder
          gameId={gameId}
          model={editingModel}
          onClose={() => {
            setShowBuilder(false);
            setEditingModel(null);
          }}
          onSuccess={() => {
            setShowBuilder(false);
            setEditingModel(null);
            loadModels();
          }}
        />
      )}

      {/* Modal Détails */}
      {selectedModel && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-lg flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">{selectedModel.name}</h2>
              <button
                onClick={() => setSelectedModel(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedModel.description && (
                <p className="text-gray-300">{selectedModel.description}</p>
              )}

              {/* Schéma complet */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Schéma JSON</h3>
                <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedModel.schema, null, 2)}
                </pre>
              </div>

              <button
                onClick={() => setSelectedModel(null)}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
