// 📍 Fichier : frontend/src/components/UICustomizer.jsx
// 🎯 Rôle : Permet au MJ de personnaliser l'apparence de la partie
// 💡 Preview en temps réel + sauvegarde dans Game.customStyles

import { useState, useEffect } from 'react';
import { gameAPI } from '../services/api';

export default function UICustomizer({ gameId, currentStyles, onClose, onSave }) {
  const [styles, setStyles] = useState({
    backgroundColor: '#1f2937', // gray-800
    primaryColor: '#6366f1',    // indigo-500
    secondaryColor: '#8b5cf6',  // violet-500
    backgroundImage: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  });
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);

  useEffect(() => {
    if (currentStyles) {
      setStyles({
        backgroundColor: currentStyles.backgroundColor || '#1f2937',
        primaryColor: currentStyles.primaryColor || '#6366f1',
        secondaryColor: currentStyles.secondaryColor || '#8b5cf6',
        backgroundImage: currentStyles.backgroundImage || '',
        backgroundSize: currentStyles.backgroundSize || 'cover',
        backgroundPosition: currentStyles.backgroundPosition || 'center',
      });
    }
  }, [currentStyles]);

  const handleSave = async () => {
  setLoading(true);
  try {
    console.log('📤 Envoi des styles:', styles);
    const result = await gameAPI.updateGame(gameId, { customStyles: styles });
    console.log('✅ Résultat sauvegarde:', result);
    onSave(styles);
    alert('✅ Personnalisation sauvegardée !');
    onClose();
  } catch (error) {
    console.error('❌ Erreur sauvegarde personnalisation:', error);
    console.error('📛 Détails:', error.response?.data);
    alert('❌ Erreur lors de la sauvegarde');
  } finally {
    setLoading(false);
  }
};

  const handleReset = () => {
    const defaultStyles = {
      backgroundColor: '#1f2937',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      backgroundImage: '',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
    setStyles(defaultStyles);
  };

  const presets = [
    {
      name: '🌙 Sombre (Défaut)',
      styles: {
        backgroundColor: '#1f2937',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        backgroundImage: '',
      },
    },
    {
      name: '🔥 Lave',
      styles: {
        backgroundColor: '#450a0a',
        primaryColor: '#dc2626',
        secondaryColor: '#f97316',
        backgroundImage: '',
      },
    },
    {
      name: '❄️ Glace',
      styles: {
        backgroundColor: '#0c4a6e',
        primaryColor: '#0ea5e9',
        secondaryColor: '#06b6d4',
        backgroundImage: '',
      },
    },
    {
      name: '🌲 Forêt',
      styles: {
        backgroundColor: '#14532d',
        primaryColor: '#22c55e',
        secondaryColor: '#84cc16',
        backgroundImage: '',
      },
    },
    {
      name: '👑 Royal',
      styles: {
        backgroundColor: '#3730a3',
        primaryColor: '#a855f7',
        secondaryColor: '#d946ef',
        backgroundImage: '',
      },
    },
  ];

  const applyPreset = (preset) => {
    setStyles({
      ...styles,
      ...preset.styles,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🎨 Personnaliser l'Apparence</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Panneau de contrôles */}
          <div className="w-96 bg-gray-800 border-r border-gray-700 overflow-y-auto p-6">
            
            {/* Presets */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">🎨 Thèmes Prédéfinis</h3>
              <div className="grid grid-cols-1 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-left"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleurs */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">🎨 Couleurs</h3>
              
              <div className="space-y-4">
                {/* Couleur de fond */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Couleur de Fond
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={styles.backgroundColor}
                      onChange={(e) => setStyles({ ...styles, backgroundColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styles.backgroundColor}
                      onChange={(e) => setStyles({ ...styles, backgroundColor: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>

                {/* Couleur primaire */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Couleur Primaire
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={styles.primaryColor}
                      onChange={(e) => setStyles({ ...styles, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styles.primaryColor}
                      onChange={(e) => setStyles({ ...styles, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>

                {/* Couleur secondaire */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Couleur Secondaire
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={styles.secondaryColor}
                      onChange={(e) => setStyles({ ...styles, secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styles.secondaryColor}
                      onChange={(e) => setStyles({ ...styles, secondaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Image de fond */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">🖼️ Image de Fond</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL de l'Image
                  </label>
                  <input
                    type="url"
                    value={styles.backgroundImage}
                    onChange={(e) => setStyles({ ...styles, backgroundImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  />
                </div>

                {styles.backgroundImage && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Taille
                      </label>
                      <select
                        value={styles.backgroundSize}
                        onChange={(e) => setStyles({ ...styles, backgroundSize: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      >
                        <option value="cover">Couvrir (Cover)</option>
                        <option value="contain">Contenir (Contain)</option>
                        <option value="auto">Automatique</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Position
                      </label>
                      <select
                        value={styles.backgroundPosition}
                        onChange={(e) => setStyles({ ...styles, backgroundPosition: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      >
                        <option value="center">Centre</option>
                        <option value="top">Haut</option>
                        <option value="bottom">Bas</option>
                        <option value="left">Gauche</option>
                        <option value="right">Droite</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bouton Reset */}
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition mb-6"
            >
              🔄 Réinitialiser
            </button>

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">👁️ Aperçu</h3>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                    className="rounded"
                  />
                  Mode Preview
                </label>
              </div>

              {previewMode && (
                <div
                  className="rounded-lg overflow-hidden border-2 border-gray-700"
                  style={{
                    backgroundColor: styles.backgroundColor,
                    backgroundImage: styles.backgroundImage ? `url(${styles.backgroundImage})` : 'none',
                    backgroundSize: styles.backgroundSize,
                    backgroundPosition: styles.backgroundPosition,
                    minHeight: '500px',
                  }}
                >
                  <div className="p-8">
                    {/* Exemple de contenu */}
                    <div className="max-w-2xl mx-auto bg-gray-900 bg-opacity-80 rounded-lg p-6 backdrop-blur-sm">
                      <h2 className="text-3xl font-bold text-white mb-4">
                        Aperçu de la Partie
                      </h2>
                      <p className="text-gray-300 mb-6">
                        Voici comment apparaîtra votre partie avec ces couleurs et ce fond.
                      </p>

                      {/* Boutons de démonstration */}
                      <div className="flex gap-3 mb-6">
                        <button
                          className="px-4 py-2 rounded-lg text-white transition"
                          style={{ backgroundColor: styles.primaryColor }}
                        >
                          Bouton Primaire
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg text-white transition"
                          style={{ backgroundColor: styles.secondaryColor }}
                        >
                          Bouton Secondaire
                        </button>
                      </div>

                      {/* Exemple de carte */}
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-2">Exemple de Carte</h3>
                        <p className="text-gray-400 text-sm">
                          Les cartes de personnages, templates, etc. s'afficheront ainsi.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
