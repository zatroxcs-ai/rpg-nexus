// frontend/src/components/TokenCreator.jsx
// Modal pour créer un token depuis un personnage ou custom

import { useState } from 'react';

export default function TokenCreator({ characters, onCreateToken, onCancel, position }) {
  const [tokenType, setTokenType] = useState('character'); // 'character' ou 'custom'
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#ff0000');
  const [isEnemy, setIsEnemy] = useState(false);
  const [size, setSize] = useState(1);

  const handleCreate = () => {
    if (tokenType === 'character') {
      const character = characters.find(c => c.id === selectedCharacter);
      if (!character) {
        alert('Veuillez sélectionner un personnage');
        return;
      }

      onCreateToken({
        name: character.name,
        characterId: character.id,
        avatar: character.avatar,
        color: isEnemy ? '#ff0000' : '#00ff00',
        isEnemy,
        size,
        x: position.x,
        y: position.y,
      });
    } else {
      if (!customName.trim()) {
        alert('Veuillez entrer un nom');
        return;
      }

      onCreateToken({
        name: customName,
        color: customColor,
        isEnemy,
        size,
        x: position.x,
        y: position.y,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Créer un Token</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Type de token */}
        <div className="mb-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTokenType('character')}
              className={`flex-1 px-4 py-2 rounded transition ${
                tokenType === 'character'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              👤 Personnage
            </button>
            <button
              onClick={() => setTokenType('custom')}
              className={`flex-1 px-4 py-2 rounded transition ${
                tokenType === 'custom'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✨ Custom
            </button>
          </div>

          {/* Depuis personnage */}
          {tokenType === 'character' && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Sélectionner un personnage
              </label>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choisir --</option>
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom */}
          {tokenType === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nom du token
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Gobelin, Dragon..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Couleur
                </label>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Options communes */}
        <div className="space-y-3 mb-6">
          {/* Taille */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Taille (en cases)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="4"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-white font-semibold w-12">{size}×{size}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              1 = Medium, 2 = Large, 3 = Huge, 4 = Gargantuan
            </p>
          </div>

          {/* Ennemi */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isEnemy"
              checked={isEnemy}
              onChange={(e) => setIsEnemy(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isEnemy" className="text-sm text-gray-300">
              🔴 Marquer comme ennemi (bordure rouge)
            </label>
          </div>
        </div>

        {/* Position */}
        <div className="mb-6 p-3 bg-gray-700 rounded">
          <p className="text-sm text-gray-300">
            📍 Position: Case ({position.x}, {position.y})
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
          >
            ✅ Créer Token
          </button>
        </div>
      </div>
    </div>
  );
}
