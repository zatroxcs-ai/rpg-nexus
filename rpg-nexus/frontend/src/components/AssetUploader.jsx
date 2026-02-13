// 📍 Fichier : frontend/src/components/AssetUploader.jsx
// 🎯 Rôle : Zone d'upload drag & drop
// 💡 Upload de fichiers vers le serveur

import { useState } from 'react';

export default function AssetUploader({ gameId, onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    setProgress(0);

    try {
      const token = localStorage.getItem('token');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`http://localhost:3000/api/asset/upload/${gameId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erreur lors de l\'upload');
        }

        setProgress(((i + 1) / files.length) * 100);
      }

      // Succès
      onUploadComplete();
      setProgress(0);
    } catch (error) {
      console.error('Erreur upload:', error);
      alert(`Erreur : ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700 hover:border-indigo-500 transition">
      <div
        className={`text-center ${isDragging ? 'opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div>
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-lg font-semibold text-white mb-2">Upload en cours...</h3>
            <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
              <div
                className="bg-indigo-600 h-4 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{Math.round(progress)}%</p>
          </div>
        ) : (
          <>
            <div className="text-6xl mb-4">📤</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Glissez vos fichiers ici
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Images, Vidéos, Audios, PDF, Modèles 3D
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Taille max : 50 MB par fichier
            </p>
            <label className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition">
              <span>📁 Choisir des fichiers</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.glb,.gltf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
