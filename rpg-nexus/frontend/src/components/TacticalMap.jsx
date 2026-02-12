// frontend/src/components/TacticalMap.jsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import TokenCreator from './TokenCreator';

import SceneSettings from './SceneSettings';

const API = 'http://localhost:3000/api';

const toFullUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:3000${url}`;
};

export default function TacticalMap({ isGameMaster, characters = [] }) {
  const { gameId } = useParams();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [atlas, setAtlas] = useState(null);
  const [activeScene, setActiveScene] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(3);

  const [draggingToken, setDraggingToken] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentDrawing, setCurrentDrawing] = useState(null);

  const [measuring, setMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState(null);
  const [measureEnd, setMeasureEnd] = useState(null);

  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);

  const [showTokenCreator, setShowTokenCreator] = useState(false);
  const [tokenPosition, setTokenPosition] = useState(null);
  const [showScenePanel, setShowScenePanel] = useState(true);
  const [showSceneSettings, setShowSceneSettings] = useState(false);
  const [editingScene, setEditingScene] = useState(null);

  const authHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const loadAtlas = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tactical-map/${gameId}/atlas`, { headers: authHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAtlas(data);
      const active = data.scenes.find(s => s.id === data.activeSceneId) || data.scenes[0];
      setActiveScene(active);
    } catch (err) {
      console.error('Erreur chargement atlas:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => { loadAtlas(); }, [loadAtlas]);
  useEffect(() => { if (activeScene) drawMap(); }, [activeScene, currentDrawing, measureStart, measureEnd]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeScene) return;
    try {
      const ctx = canvas.getContext('2d');
      const {
        gridSize, gridWidth, gridHeight, gridColor, gridOpacity,
        backgroundColor, backgroundImage, backgroundOpacity,
        tokens, drawings,
      } = activeScene;
      const W = gridSize * gridWidth;
      const H = gridSize * gridHeight;
      canvas.width = W;
      canvas.height = H;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, W, H);

      const bgUrl = toFullUrl(backgroundImage);
      if (bgUrl) {
        const cacheKey = `bg-${bgUrl}`;
        const cached = window[cacheKey];
        if (cached && cached !== 'error' && cached.complete && cached.naturalWidth > 0) {
          ctx.globalAlpha = backgroundOpacity;
          ctx.drawImage(cached, 0, 0, W, H);
          ctx.globalAlpha = 1;
        } else if (!cached) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { window[cacheKey] = img; drawMap(); };
          img.onerror = () => { window[cacheKey] = 'error'; };
          img.src = bgUrl;
          window[cacheKey] = img;
        }
      }

      ctx.globalAlpha = gridOpacity;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let x = 0; x <= gridWidth; x++) {
        ctx.beginPath(); ctx.moveTo(x * gridSize, 0); ctx.lineTo(x * gridSize, H); ctx.stroke();
      }
      for (let y = 0; y <= gridHeight; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * gridSize); ctx.lineTo(W, y * gridSize); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      drawings?.forEach(d => drawShape(ctx, d, gridSize));
      if (currentDrawing) drawShape(ctx, currentDrawing, gridSize);
      tokens?.forEach(t => drawToken(ctx, t, gridSize));

      if (measuring && measureStart && measureEnd) {
        drawMeasure(ctx, measureStart, measureEnd, gridSize, activeScene.cellUnit);
      }
    } catch (err) {
      console.error('Erreur drawMap:', err);
    }
  };

  const drawToken = (ctx, token, gridSize) => {
    const x = token.x * gridSize;
    const y = token.y * gridSize;
    const size = token.size * gridSize;
    const radius = size / 2 - 3;
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.clip();

    const avatarUrl = toFullUrl(token.avatar);
    const cacheKey = `tok-${avatarUrl}`;
    const cached = window[cacheKey];
    if (avatarUrl && cached && cached !== 'error' && cached.complete && cached.naturalWidth > 0) {
      ctx.drawImage(cached, x + 3, y + 3, size - 6, size - 6);
    } else {
      if (avatarUrl && !cached) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { window[cacheKey] = img; drawMap(); };
        img.onerror = () => { window[cacheKey] = 'error'; };
        img.src = avatarUrl;
        window[cacheKey] = img;
      }
      ctx.fillStyle = token.color || '#888888';
      ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
    }

    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = token.isEnemy ? '#ff3333' : '#33ff33';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, gridSize / 4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(token.name, cx, y + size + 14);
    ctx.shadowBlur = 0;

    if (token.hp !== undefined && token.maxHp !== undefined) {
      const pct = token.hp / token.maxHp;
      ctx.fillStyle = pct <= 0.3 ? '#ff3333' : pct <= 0.6 ? '#ffaa00' : '#33ff33';
      ctx.font = `bold ${Math.max(9, gridSize / 5)}px Arial`;
      ctx.shadowBlur = 3;
      ctx.fillText(`${token.hp}/${token.maxHp}`, cx, y - 4);
      ctx.shadowBlur = 0;
    }
  };

  const drawShape = (ctx, d, gridSize) => {
    ctx.strokeStyle = d.color;
    ctx.fillStyle = d.color + '44';
    ctx.lineWidth = d.strokeWidth || 3;
    ctx.globalAlpha = d.opacity || 1;
    switch (d.type) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(d.points[0] * gridSize, d.points[1] * gridSize);
        ctx.lineTo(d.points[2] * gridSize, d.points[3] * gridSize);
        ctx.stroke();
        break;
      case 'rectangle':
        ctx.strokeRect(d.x * gridSize, d.y * gridSize, d.width * gridSize, d.height * gridSize);
        ctx.fillRect(d.x * gridSize, d.y * gridSize, d.width * gridSize, d.height * gridSize);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(d.x * gridSize, d.y * gridSize, d.radius * gridSize, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        break;
      default:
        break;
    }
    ctx.globalAlpha = 1;
  };

  const drawMeasure = (ctx, start, end, gridSize, cellUnit) => {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const dx = Math.abs(end.x - start.x) / gridSize;
    const dy = Math.abs(end.y - start.y) / gridSize;
    const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
    const unit = parseFloat(cellUnit) || 5;
    const label = cellUnit.replace(/[0-9.]/g, '') || 'ft';
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(`${dist} cases (${(dist * unit).toFixed(0)}${label})`, (start.x + end.x) / 2, (start.y + end.y) / 2 - 10);
    ctx.shadowBlur = 0;
  };

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const getGridPos = (pos) => ({
    x: Math.floor(pos.x / activeScene.gridSize),
    y: Math.floor(pos.y / activeScene.gridSize),
  });

  const findTokenAt = (pos) => {
    if (!activeScene) return null;
    return activeScene.tokens?.find(t => {
      const tx = t.x * activeScene.gridSize;
      const ty = t.y * activeScene.gridSize;
      const size = t.size * activeScene.gridSize;
      return pos.x >= tx && pos.x <= tx + size && pos.y >= ty && pos.y <= ty + size;
    });
  };

  const handleMouseDown = (e) => {
    if (!activeScene) return;
    const pos = getCanvasPos(e);
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }
    if (!isGameMaster) return;
    if (selectedTool === 'measure') { setMeasuring(true); setMeasureStart(pos); setMeasureEnd(pos); return; }
    if (selectedTool === 'token') { setTokenPosition(getGridPos(pos)); setShowTokenCreator(true); return; }
    if (selectedTool === 'delete') {
      const t = findTokenAt(pos);
      if (t && confirm(`Supprimer "${t.name}" ?`)) removeToken(t.id);
      return;
    }
    if (selectedTool === 'select') {
      const t = findTokenAt(pos);
      if (t) {
        setDraggingToken(t);
        setDragOffset({ x: pos.x - t.x * activeScene.gridSize, y: pos.y - t.y * activeScene.gridSize });
        return;
      }
    }
    if (['line', 'rect', 'circle'].includes(selectedTool)) {
      setIsDrawing(true);
      setDrawStart({ x: pos.x / activeScene.gridSize, y: pos.y / activeScene.gridSize });
    }
  };

  const handleMouseMove = (e) => {
    if (!activeScene) return;
    const pos = getCanvasPos(e);
    if (isPanning && panStart) {
      setPanOffset(prev => ({ x: prev.x + e.clientX - panStart.x, y: prev.y + e.clientY - panStart.y }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    if (measuring) { setMeasureEnd(pos); return; }
    if (draggingToken) {
      const newX = Math.max(0, Math.floor((pos.x - dragOffset.x) / activeScene.gridSize));
      const newY = Math.max(0, Math.floor((pos.y - dragOffset.y) / activeScene.gridSize));
      setActiveScene(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === draggingToken.id ? { ...t, x: newX, y: newY } : t) }));
      return;
    }
    if (isDrawing && drawStart && isGameMaster) {
      const gx = pos.x / activeScene.gridSize;
      const gy = pos.y / activeScene.gridSize;
      let d = null;
      if (selectedTool === 'line') d = { type: 'line', points: [drawStart.x, drawStart.y, gx, gy], color: selectedColor, strokeWidth };
      else if (selectedTool === 'rect') d = { type: 'rectangle', x: Math.min(drawStart.x, gx), y: Math.min(drawStart.y, gy), width: Math.abs(gx - drawStart.x), height: Math.abs(gy - drawStart.y), color: selectedColor, strokeWidth };
      else if (selectedTool === 'circle') d = { type: 'circle', x: drawStart.x, y: drawStart.y, radius: Math.sqrt((gx - drawStart.x) ** 2 + (gy - drawStart.y) ** 2), color: selectedColor, strokeWidth };
      setCurrentDrawing(d);
    }
  };

  const handleMouseUp = async () => {
    setIsPanning(false);
    setPanStart(null);
    if (measuring) { setMeasuring(false); setMeasureStart(null); setMeasureEnd(null); return; }
    if (draggingToken) {
      await apiCall(`/scene/${activeScene.id}/token/${draggingToken.id}/move`, 'PUT', { x: draggingToken.x, y: draggingToken.y });
      setDraggingToken(null);
      return;
    }
    if (isDrawing && currentDrawing) {
      await apiCall(`/scene/${activeScene.id}/drawing`, 'POST', currentDrawing);
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentDrawing(null);
      await loadAtlas();
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  const apiCall = async (path, method = 'GET', body = null) => {
    const res = await fetch(`${API}/tactical-map/${gameId}${path}`, {
      method,
      headers: authHeader(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const switchScene = async (sceneId) => {
    await apiCall(`/switch/${sceneId}`, 'PUT');
    await loadAtlas();
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const createScene = async () => {
    const name = prompt('Nom de la nouvelle scène:', 'Nouvelle Scène');
    if (!name) return;
    await apiCall('/scene', 'POST', { name });
    await loadAtlas();
  };

  const deleteScene = async (sceneId) => {
    if (!confirm('Supprimer cette scène ?')) return;
    await apiCall(`/scene/${sceneId}`, 'DELETE');
    await loadAtlas();
  };

  const saveSceneSettings = async (settings) => {
    await apiCall(`/scene/${editingScene.id}/rename`, 'PUT', { name: settings.name });
    await apiCall(`/scene/${editingScene.id}/config`, 'PUT', settings);
    setShowSceneSettings(false);
    setEditingScene(null);
    await loadAtlas();
  };

  const addToken = async (tokenData) => {
    await apiCall(`/scene/${activeScene.id}/token`, 'POST', tokenData);
    setShowTokenCreator(false);
    await loadAtlas();
  };

  const removeToken = async (tokenId) => {
    await apiCall(`/scene/${activeScene.id}/token/${tokenId}`, 'DELETE');
    await loadAtlas();
  };

  const clearDrawings = async () => {
    if (!confirm('Effacer tous les dessins de cette scène ?')) return;
    await apiCall(`/scene/${activeScene.id}/drawings`, 'DELETE');
    setActiveScene(prev => ({ ...prev, drawings: [] }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-xl">
      🗺️ Chargement de l'atlas...
    </div>
  );

  if (!activeScene) return (
    <div className="flex items-center justify-center h-full text-red-400">
      ❌ Erreur chargement de la carte
    </div>
  );

  const tools = [
    { id: 'select', icon: '↖️', title: 'Selectionner' },
    { id: 'token', icon: '👤', title: 'Ajouter token' },
    { id: 'line', icon: '📏', title: 'Ligne' },
    { id: 'rect', icon: '▭', title: 'Rectangle' },
    { id: 'circle', icon: '⭕', title: 'Cercle' },
    { id: 'measure', icon: '📐', title: 'Mesurer' },
    { id: 'delete', icon: '🗑️', title: 'Supprimer token' },
  ];

  return (
    <div className="flex h-full bg-gray-900">
      {showScenePanel && (
        <div className="w-56 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-white font-bold text-sm">🗺️ Atlas</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {atlas?.scenes.map(scene => (
              <div
                key={scene.id}
                className={`rounded-lg border transition ${scene.id === activeScene.id ? 'border-indigo-500 bg-indigo-900 bg-opacity-40' : 'border-gray-600 bg-gray-700 hover:bg-gray-600'}`}
              >
                <div className="p-2">
                  <button onClick={() => switchScene(scene.id)} className="w-full text-left text-sm font-medium text-white">
                    {scene.id === activeScene.id ? '▶ ' : '  '}{scene.name}
                  </button>
                  {isGameMaster && (
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => { setEditingScene(scene); setShowSceneSettings(true); }} className="text-xs text-gray-400 hover:text-white">✏️</button>
                      {atlas.scenes.length > 1 && (
                        <button onClick={() => deleteScene(scene.id)} className="text-xs text-gray-400 hover:text-red-400">🗑️</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {isGameMaster && (
            <div className="p-2 border-t border-gray-700">
              <button onClick={createScene} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition">
              + Nouvelle Scène
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowScenePanel(p => !p)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
            {showScenePanel ? '◀' : '▶'} Atlas
          </button>
          <span className="text-gray-300 text-sm font-semibold border-l border-gray-600 pl-3">📍 {activeScene.name}</span>
          {isGameMaster && (
            <>
              <div className="border-l border-gray-600 h-6" />
              <div className="flex gap-1">
                {tools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    title={tool.title}
                    className={`px-2 py-1 rounded text-xs transition ${selectedTool === tool.id ? (tool.id === 'delete' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white') : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    {tool.icon}
                  </button>
                ))}
              </div>
              <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <input type="range" min="1" max="10" value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} className="w-16" />
              <button onClick={clearDrawings} className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-sm">🗑️ Dessins</button>
            </>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setZoom(p => Math.max(0.3, p - 0.1))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">−</button>
            <span className="text-gray-300 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(p => Math.min(3, p + 0.1))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">+</button>
            <button onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm" title="Reset vue">↻</button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-950 p-4">
          <div style={{ transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: 'top left' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="border-2 border-gray-600 cursor-crosshair block"
            />
          </div>
        </div>
      </div>

      {showSceneSettings && editingScene && (
        <SceneSettings
          scene={editingScene}
          gameId={gameId}
          onSave={saveSceneSettings}
          onCancel={() => { setShowSceneSettings(false); setEditingScene(null); }}
        />
      )}

      {showTokenCreator && (
        <TokenCreator
          characters={characters}
          position={tokenPosition}
          onCreateToken={addToken}
          onCancel={() => setShowTokenCreator(false)}
        />
      )}

    </div>
  );
}
