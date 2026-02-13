// frontend/src/components/TokenCreator.jsx

import { useState } from 'react';

const toFullUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:3000${url}`;
};

export default function TokenCreator({ characters, monsters = [], onCreateToken, onCancel, position }) {
  const [tokenType, setTokenType] = useState('character');
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedMonster, setSelectedMonster] = useState('');
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#ff0000');
  const [isEnemy, setIsEnemy] = useState(false);
  const [size, setSize] = useState(1);

  const handleCreate = () => {
    if (tokenType === 'character') {
      const character = characters.find(c => c.id === selectedCharacter);
      if (!character) { alert('Veuillez selectionner un personnage'); return; }
      const charData = character.data || {};
      const charStats = charData.stats || {};
      const charFields = charData.fields || {};
      const hp = charStats['HP'] ?? charFields['HP'] ?? 10;
      const maxHp = charStats['HP Max'] ?? charFields['HP Max'] ?? hp;
      const ac = charStats['CA'] ?? charFields['CA'] ?? 10;
      onCreateToken({
        name: character.name,
        characterId: character.id,
        avatar: character.avatar,
        color: '#00ff00',
        isEnemy: false,
        size,
        x: position.x,
        y: position.y,
        hp,
        maxHp,
        ac,
      });
    } else if (tokenType === 'monster') {
      const monster = monsters.find(m => m.id === selectedMonster);
      if (!monster) { alert('Veuillez selectionner un monstre'); return; }
      onCreateToken({
        name: monster.name,
        monsterId: monster.id,
        avatar: monster.avatar,
        color: '#ff0000',
        isEnemy: true,
        size,
        x: position.x,
        y: position.y,
        hp: monster.hp ?? 10,
        maxHp: monster.maxHp ?? monster.hp ?? 10,
        ac: monster.ac ?? 10,
      });
    } else {
      if (!customName.trim()) { alert('Veuillez entrer un nom'); return; }
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

  const selectedChar = characters.find(c => c.id === selectedCharacter);
  const selectedMon = monsters.find(m => m.id === selectedMonster);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Creer un Token</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white text-2xl">x</button>
        </div>

        <div className="mb-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTokenType('character')}
              className={`flex-1 px-3 py-2 rounded transition text-sm ${tokenType === 'character' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              Personnage
            </button>
            <button onClick={() => { setTokenType('monster'); setIsEnemy(true); }}
              className={`flex-1 px-3 py-2 rounded transition text-sm ${tokenType === 'monster' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              Monstre
            </button>
            <button onClick={() => setTokenType('custom')}
              className={`flex-1 px-3 py-2 rounded transition text-sm ${tokenType === 'custom' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              Custom
            </button>
          </div>

          {tokenType === 'character' && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Selectionner un personnage</label>
              <select value={selectedCharacter} onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-indigo-500 focus:outline-none">
                <option value="">-- Choisir --</option>
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </select>
              {selectedChar && (() => {
                const cd = selectedChar.data || {};
                const cs = cd.stats || {};
                const cf = cd.fields || {};
                const charHp = cs['HP'] ?? cf['HP'] ?? '?';
                const charAc = cs['CA'] ?? cf['CA'] ?? '?';
                return (
                  <div className="mt-3 flex items-center gap-3 bg-gray-700 rounded-lg p-2 border border-gray-600">
                    {selectedChar.avatar ? (
                      <img src={toFullUrl(selectedChar.avatar)} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-900 border-2 border-indigo-500 flex items-center justify-center text-white font-bold">{selectedChar.name?.[0]}</div>
                    )}
                    <div>
                      <p className="text-white font-semibold text-sm">{selectedChar.name}</p>
                      <p className="text-gray-400 text-xs">HP: {charHp} | CA: {charAc}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {tokenType === 'monster' && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Selectionner un monstre</label>
              <select value={selectedMonster} onChange={(e) => setSelectedMonster(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-red-500 focus:outline-none">
                <option value="">-- Choisir --</option>
                {monsters.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {selectedMon && (
                <div className="mt-3 flex items-center gap-3 bg-gray-700 rounded-lg p-2 border border-gray-600">
                  {selectedMon.avatar ? (
                    <img src={toFullUrl(selectedMon.avatar)} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-red-500" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-900 border-2 border-red-500 flex items-center justify-center text-white font-bold">{selectedMon.name?.[0]}</div>
                  )}
                  <div>
                    <p className="text-white font-semibold text-sm">{selectedMon.name}</p>
                    <p className="text-gray-400 text-xs">HP: {selectedMon.hp ?? '?'} | CA: {selectedMon.ac ?? '?'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tokenType === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Nom du token</label>
                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Gobelin, Dragon..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Couleur</label>
                <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)}
                  className="w-full h-10 rounded cursor-pointer" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Taille (en cases)</label>
            <div className="flex items-center gap-3">
              <input type="range" min="1" max="4" value={size} onChange={(e) => setSize(parseInt(e.target.value))} className="flex-1" />
              <span className="text-white font-semibold w-12">{size}x{size}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">1 = Moyen, 2 = Grand, 3 = Enorme, 4 = Colossal</p>
          </div>

          {tokenType === 'custom' && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isEnemy" checked={isEnemy} onChange={(e) => setIsEnemy(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="isEnemy" className="text-sm text-gray-300">Marquer comme ennemi (bordure rouge)</label>
            </div>
          )}
        </div>

        <div className="mb-6 p-3 bg-gray-700 rounded">
          <p className="text-sm text-gray-300">Position: Case ({position.x}, {position.y})</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition">Annuler</button>
          <button onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition">Creer Token</button>
        </div>
      </div>
    </div>
  );
}
