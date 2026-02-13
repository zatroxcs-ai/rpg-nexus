// 📍 Fichier : frontend/src/components/AssetManager.jsx
// 🎯 Rôle : Interface principale de gestion des assets
// 💡 Upload + Bibliothèque + Filtres

import { useState, useEffect } from 'react';
import { assetAPI } from '../services/api';
import AssetUploader from './AssetUploader';
import AssetCard from './AssetCard';

export default function AssetManager({ gameId, currentUserId, isGameMaster }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, image, video, audio, document, model3d

  useEffect(() => {
    loadAssets();
  }, [gameId]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await assetAPI.getByGame(gameId);
      setAssets(data);
    } catch (error) {
      console.error('Erreur chargement assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assetId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
      return;
    }

    try {
      await assetAPI.delete(assetId);
      await loadAssets();
    } catch (error) {
      console.error('Erreur suppression asset:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredAssets = filter === 'all'
    ? assets
    : assets.filter((asset) => asset.category === filter);

  const assetCounts = {
    all: assets.length,
    image: assets.filter((a) => a.category === 'image').length,
    video: assets.filter((a) => a.category === 'video').length,
    audio: assets.filter((a) => a.category === 'audio').length,
    document: assets.filter((a) => a.category === 'document').length,
    model3d: assets.filter((a) => a.category === 'model3d').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement des fichiers...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">📦 Bibliothèque de Fichiers</h2>
        <div className="text-sm text-gray-400">
          {assets.length} fichier{assets.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Upload Zone */}
      <AssetUploader gameId={gameId} onUploadComplete={loadAssets} />

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          📁 Tous ({assetCounts.all})
        </button>
        <button
          onClick={() => setFilter('image')}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            filter === 'image'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🖼️ Images ({assetCounts.image})
        </button>
        <button
          onClick={() => setFilter('video')}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            filter === 'video'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🎥 Vidéos ({assetCounts.video})
        </button>
        <button
          onClick={() => setFilter('audio')}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            filter === 'audio'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🎵 Audio ({assetCounts.audio})
        </button>
        <button
          onClick={() => setFilter('document')}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            filter === 'document'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          📄 Documents ({assetCounts.document})
        </button>
        <button
          onClick={() => setFilter('model3d')}
          className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
            filter === 'model3d'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🎨 3D ({assetCounts.model3d})
        </button>
      </div>

      {/* Grid d'assets */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === 'all' ? 'Aucun fichier pour le moment' : `Aucun fichier de type "${filter}"`}
          </h3>
          <p className="text-gray-400">
            Uploadez vos premiers fichiers ci-dessus
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={handleDelete}
              canDelete={isGameMaster || asset.uploaderId === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
