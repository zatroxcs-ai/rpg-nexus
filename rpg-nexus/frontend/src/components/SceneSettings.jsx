// frontend/src/components/SceneSettings.jsx

import { useState, useEffect } from 'react';

const normalizeUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://localhost:3000')) {
    return url.replace('http://localhost:3000', import.meta.env.VITE_API_URL || 'http://localhost:3000');
  }
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;
};

export default function SceneSettings({ scene, gameId, onSave, onCancel }) {
  const [name, setName] = useState(scene.name || '');
  const [gridSize, setGridSize] = useState(scene.gridSize || 50);
  const [gridWidth, setGridWidth] = useState(scene.gridWidth || 30);
  const [gridHeight, setGridHeight] = useState(scene.gridHeight || 20);
  const [gridColor, setGridColor] = useState(scene.gridColor || '#444444');
  const [gridOpacity, setGridOpacity] = useState(scene.gridOpacity ?? 0.5);
  const [backgroundColor, setBackgroundColor] = useState(scene.backgroundColor || '#1a1a1a');
  const [backgroundImage, setBackgroundImage] = useState(normalizeUrl(scene.backgroundImage));
  const [backgroundOpacity, setBackgroundOpacity] = useState(scene.backgroundOpacity ?? 1.0);
  const [cellUnit, setCellUnit] = useState(scene.cellUnit || '5ft');
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/asset/game/${gameId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const images = data.filter(a => {
        const mime = a.mimetype || a.mimeType || a.type || '';
        const url = a.url || a.path || '';
        if (!mime) return url.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i);
        return mime.startsWith('image/');
      });

      setAssets(images);
    } catch (e) {
      console.error('Erreur assets:', e);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      gridSize,
      gridWidth,
      gridHeight,
      gridColor,
      gridOpacity,
      backgroundColor,
      backgroundImage: backgroundImage || null,
      backgroundOpacity,
      cellUnit,
    });
  };

  const tabs = [
    { id: 'general', label: '⚙️ Général' },
    { id: 'grid', label: '🔲 Grille' },
    { id: 'background', label: '🖼️ Fond' },
  ];

  // Grille CSS preview
  const gridPreviewStyle = {
    backgroundColor,
    backgroundImage: `
      linear-gradient(${gridColor}${Math.round(gridOpacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
      linear-gradient(90deg, ${gridColor}${Math.round(gridOpacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize}px ${gridSize}px`,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-2">
      <div className="bg-gray-800 rounded-xl w-full h-full max-w-7xl max-h-[98vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">⚙️ Paramètres de la Scène</h2>
            <p className="text-gray-400 text-sm mt-1">Scène : <span className="text-indigo-400 font-semibold">{scene.name}</span></p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white text-3xl leading-none px-2">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-4 text-base font-semibold transition ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* ═══ GÉNÉRAL ═══ */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Nom de la scène</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: Donjon du Roi, Forêt Maudite..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Unité de mesure</label>
                  <select
                    value={cellUnit}
                    onChange={e => setCellUnit(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="5ft">5 pieds (D&D 5e)</option>
                    <option value="1.5m">1.5 mètre</option>
                    <option value="2m">2 mètres</option>
                    <option value="1case">1 case</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Couleur de fond</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={e => setBackgroundColor(e.target.value)}
                      className="w-16 h-12 rounded-lg cursor-pointer border border-gray-600"
                    />
                    <span className="text-gray-400">{backgroundColor}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Aperçu</label>
                <div className="rounded-lg w-full border border-gray-600" style={{ height: '200px', ...gridPreviewStyle }} />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {gridWidth} × {gridHeight} cases — {gridWidth * gridSize}×{gridHeight * gridSize}px
                </p>
              </div>
            </div>
          )}

          {/* ═══ GRILLE ═══ */}
          {activeTab === 'grid' && (
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    Taille d'une case : <span className="text-indigo-400">{gridSize}px</span>
                  </label>
                  <input type="range" min="20" max="100" value={gridSize} onChange={e => setGridSize(parseInt(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1"><span>20px</span><span>100px</span></div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    Opacité de la grille : <span className="text-indigo-400">{Math.round(gridOpacity * 100)}%</span>
                  </label>
                  <input type="range" min="0" max="1" step="0.05" value={gridOpacity} onChange={e => setGridOpacity(parseFloat(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Invisible</span><span>Visible</span></div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Couleur de la grille</label>
                  <div className="flex items-center gap-4">
                    <input type="color" value={gridColor} onChange={e => setGridColor(e.target.value)} className="w-16 h-12 rounded-lg cursor-pointer border border-gray-600" />
                    <span className="text-gray-400">{gridColor}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Largeur (cases)</label>
                    <input type="number" min="5" max="100" value={gridWidth} onChange={e => setGridWidth(parseInt(e.target.value))} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Hauteur (cases)</label>
                    <input type="number" min="5" max="100" value={gridHeight} onChange={e => setGridHeight(parseInt(e.target.value))} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Aperçu en direct</label>
                <div className="rounded-lg w-full border border-gray-600" style={{ height: '300px', ...gridPreviewStyle }} />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {gridWidth} × {gridHeight} cases — {gridWidth * gridSize}×{gridHeight * gridSize}px
                </p>
              </div>
            </div>
          )}

          {/* ═══ FOND ═══ */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                      Opacité du fond : <span className="text-indigo-400">{Math.round(backgroundOpacity * 100)}%</span>
                    </label>
                    <input type="range" min="0.1" max="1" step="0.05" value={backgroundOpacity} onChange={e => setBackgroundOpacity(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <button
                    onClick={() => setBackgroundImage('')}
                    className={`w-full p-4 rounded-lg border-2 transition font-semibold ${
                      !backgroundImage
                        ? 'border-indigo-500 bg-indigo-900 bg-opacity-30 text-white'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🚫 Pas de fond (grille uniquement)
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Aperçu du fond</label>
                  {backgroundImage ? (
                    <img
                      src={backgroundImage}
                      alt="Fond sélectionné"
                      className="w-full h-40 object-cover rounded-lg border border-indigo-500"
                      style={{ opacity: backgroundOpacity }}
                    />
                  ) : (
                    <div className="w-full h-40 rounded-lg border border-gray-600 bg-gray-700 flex items-center justify-center text-gray-400">
                      Aucun fond sélectionné
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Mes images ({assets.length} disponible{assets.length > 1 ? 's' : ''})
                </label>
                {loadingAssets ? (
                  <div className="text-center py-8 text-gray-400">⏳ Chargement des images...</div>
                ) : assets.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-700 rounded-lg">
                    <p className="text-lg mb-2">📭 Aucune image trouvée</p>
                    <p className="text-sm">Uploadez des images dans l'onglet 📦 Fichiers puis revenez ici.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {assets.map(asset => {
                      const fullUrl = normalizeUrl(asset.url);
                      const isSelected = backgroundImage === fullUrl;
                      return (
                        <button
                          key={asset.id}
                          onClick={() => setBackgroundImage(fullUrl)}
                          className={`relative rounded-lg overflow-hidden border-2 aspect-video transition hover:scale-105 ${
                            isSelected
                              ? 'border-indigo-500 ring-2 ring-indigo-400'
                              : 'border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <img src={fullUrl} alt={asset.filename || asset.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">✓</div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-1">
                            <p className="text-white text-xs truncate">{asset.filename || asset.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 px-8 py-5 border-t border-gray-700 shrink-0">
          <button onClick={onCancel} className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-lg">
            Annuler
          </button>
          <button onClick={handleSave} className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-bold text-lg">
            ✅ Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
