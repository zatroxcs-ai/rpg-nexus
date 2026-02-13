// frontend/src/components/MapBackgroundSelector.jsx
// Modal pour sélectionner une image de fond depuis l'Asset Manager

import { useState, useEffect } from 'react';

export default function MapBackgroundSelector({ gameId, onSelect, onCancel, currentBackground }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(currentBackground || '');

  useEffect(() => {
    loadAssets();
  }, [gameId]);

  const loadAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/asset/game/${gameId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Erreur chargement assets');
      
      const data = await response.json();
      // Filtrer seulement les images
      const images = data.filter(asset => 
        asset.mimetype.startsWith('image/')
      );
      setAssets(images);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    onSelect(selectedAsset);
  };

  const handleRemove = () => {
    onSelect(''); // Enlever le fond
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">🖼️ Fond de Carte</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            Chargement des images...
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Aucune image disponible.</p>
            <p className="text-sm mt-2">Uploadez des images dans l'onglet "📦 Fichiers"</p>
          </div>
        ) : (
          <>
            {/* Option : Pas de fond */}
            <div className="mb-4">
              <button
                onClick={() => setSelectedAsset('')}
                className={`w-full p-4 rounded-lg border-2 transition ${
                  selectedAsset === ''
                    ? 'border-indigo-500 bg-indigo-900 bg-opacity-30'
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="text-white font-semibold">🚫 Pas de fond (grille uniquement)</div>
              </button>
            </div>

            {/* Grille d'images */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset.url)}
                  className={`relative rounded-lg overflow-hidden border-2 transition aspect-video ${
                    selectedAsset === asset.url
                      ? 'border-indigo-500 ring-2 ring-indigo-500'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2">
                    <p className="text-white text-xs truncate">{asset.filename}</p>
                  </div>
                  {selectedAsset === asset.url && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Boutons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          >
            Annuler
          </button>
          {currentBackground && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              🗑️ Enlever le fond
            </button>
          )}
          <button
            onClick={handleSelect}
            disabled={!selectedAsset && !currentBackground}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
