// 📍 Fichier : frontend/src/components/AssetCard.jsx
// 🎯 Rôle : Carte d'affichage d'un asset
// 💡 Preview + boutons actions (copier URL, supprimer)

import { useState } from 'react';

export default function AssetCard({ asset, onDelete, canDelete }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
  const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.url}`;  // ← Port 3000 en dur
  console.log('📋 URL copiée:', fullUrl);
  navigator.clipboard.writeText(fullUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryIcon = () => {
    switch (asset.category) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'model3d':
        return '🎨';
      default:
        return '📄';
    }
  };

  const renderPreview = () => {
	  const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.url}`;

    if (asset.category === 'image') {
      return (
        <img
          src={fullUrl}
          alt={asset.name}
          className="w-full h-48 object-cover"
        />
      );
    }

    if (asset.category === 'video') {
      return (
        <video
          src={fullUrl}
          className="w-full h-48 object-cover"
          controls
        />
      );
    }

    if (asset.category === 'audio') {
      return (
        <div className="w-full h-48 flex items-center justify-center bg-gray-700">
          <audio src={fullUrl} controls className="w-full px-4" />
        </div>
      );
    }

    // Fallback pour les autres types
    return (
      <div className="w-full h-48 flex items-center justify-center bg-gray-700">
        <div className="text-6xl">{getCategoryIcon()}</div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition">
      {/* Preview */}
      {renderPreview()}

      {/* Infos */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl flex-shrink-0">{getCategoryIcon()}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate" title={asset.name}>
              {asset.name}
            </h3>
            <p className="text-xs text-gray-400">
              {formatSize(asset.size)} • {asset.uploader.username}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={copyUrl}
            className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <span>✅</span>
                <span>Copié !</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copier URL</span>
              </>
            )}
          </button>
          
          {canDelete && (
            <button
              onClick={() => onDelete(asset.id)}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
              title="Supprimer"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
