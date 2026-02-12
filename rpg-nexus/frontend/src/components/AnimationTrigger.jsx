// 📍 Fichier : frontend/src/components/AnimationTrigger.jsx
// 🎯 Rôle : Interface MJ pour déclencher des animations
// 💡 Panneau de contrôle avec bibliothèque d'effets

import { useState } from 'react';
import { ANIMATION_LIBRARY, ANIMATION_CATEGORIES, POSITION_PRESETS } from '../lib/AnimationLibrary';

export default function AnimationTrigger({ onTrigger, onClose }) {
  const [selectedAnimation, setSelectedAnimation] = useState(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [category, setCategory] = useState('all');

  const handleTrigger = () => {
    if (!selectedAnimation) {
      alert('Sélectionnez une animation');
      return;
    }

    const animData = ANIMATION_LIBRARY[selectedAnimation];
    
    onTrigger({
      id: Date.now().toString(),
      effect: selectedAnimation,
      position,
      duration: animData.duration,
    });

    // Fermer après déclenchement
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const filteredAnimations = Object.entries(ANIMATION_LIBRARY).filter(
    ([key, anim]) => category === 'all' || anim.category === category
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🎬 Déclencher une Animation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bibliothèque d'animations */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-white">📚 Bibliothèque d'Effets</h3>

              {/* Filtres par catégorie */}
              <div className="flex gap-2 flex-wrap">
                {Object.entries(ANIMATION_CATEGORIES).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                      category === key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Liste des animations */}
              <div className="grid grid-cols-2 gap-3">
                {filteredAnimations.map(([key, anim]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedAnimation(key)}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      selectedAnimation === key
                        ? 'border-indigo-500 bg-indigo-900 bg-opacity-30'
                        : 'border-gray-700 bg-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{anim.name.split(' ')[0]}</div>
                    <div className="text-sm font-semibold text-white">{anim.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{anim.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {anim.duration}ms
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Panneau de configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">⚙️ Configuration</h3>

              {/* Preview de l'animation sélectionnée */}
              {selectedAnimation && (
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="text-4xl mb-2 text-center">
                    {ANIMATION_LIBRARY[selectedAnimation].name.split(' ')[0]}
                  </div>
                  <div className="text-sm text-gray-300 text-center">
                    {ANIMATION_LIBRARY[selectedAnimation].name}
                  </div>
                </div>
              )}

              {/* Position */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  📍 Position
                </label>
                
                {/* Presets de position */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Object.entries(POSITION_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setPosition({ x: preset.x, y: preset.y })}
                      className={`px-2 py-1 rounded text-xs font-semibold transition ${
                        position.x === preset.x && position.y === preset.y
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Sliders manuels */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">X: {position.x}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={position.x}
                      onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Y: {position.y}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={position.y}
                      onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Preview visuel de la position */}
              <div className="bg-gray-700 rounded-lg p-2 border border-gray-600">
                <div className="relative w-full h-32 bg-gray-900 rounded">
                  <div
                    className="absolute w-4 h-4 bg-indigo-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Preview de la position
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec boutons */}
        <div className="bg-gray-900 border-t border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Annuler
          </button>
          <button
            onClick={handleTrigger}
            disabled={!selectedAnimation}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎬 Déclencher
          </button>
        </div>
      </div>
    </div>
  );
}
