// frontend/src/components/TacticalMap.jsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import TokenCreator from './TokenCreator';
import useDataSync from '../hooks/useDataSync';
import SceneSettings from './SceneSettings';

const API = '${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api';

const toFullUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:3000${url}`;
};

const SIZE_LABELS = { 2: 'G', 3: 'E', 4: 'C' };

const CONDITIONS = [
  { id: 'poisoned', label: 'Empoisonne', color: '#22c55e', icon: 'P' },
  { id: 'stunned', label: 'Etourdi', color: '#eab308', icon: 'E' },
  { id: 'blinded', label: 'Aveugle', color: '#6b7280', icon: 'A' },
  { id: 'frightened', label: 'Effraye', color: '#a855f7', icon: 'F' },
  { id: 'charmed', label: 'Charme', color: '#ec4899', icon: 'C' },
  { id: 'paralyzed', label: 'Paralyse', color: '#f97316', icon: 'Pa' },
  { id: 'prone', label: 'A terre', color: '#78716c', icon: 'T' },
  { id: 'restrained', label: 'Entrave', color: '#64748b', icon: 'R' },
  { id: 'invisible', label: 'Invisible', color: '#06b6d4', icon: 'I' },
  { id: 'concentrating', label: 'Concentration', color: '#3b82f6', icon: 'Co' },
  { id: 'blessed', label: 'Beni', color: '#fbbf24', icon: 'B' },
  { id: 'cursed', label: 'Maudit', color: '#dc2626', icon: 'M' },
];

export default function TacticalMap({ isGameMaster, characters = [] }) {
  const { gameId } = useParams();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [atlas, setAtlas] = useState(null);
  const [activeScene, setActiveScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monsters, setMonsters] = useState([]);

  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(3);

  const [draggingToken, setDraggingToken] = useState(null);
  const draggingRef = useRef(false);
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

  const [hoveredToken, setHoveredToken] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [exploredCells, setExploredCells] = useState(new Set());

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

  const loadMonsters = useCallback(async () => {
    try {
      const res = await fetch(`${API}/monster/game/${gameId}`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setMonsters(Array.isArray(data) ? data : []);
      }
    } catch { setMonsters([]); }
  }, [gameId]);

  useEffect(() => { loadAtlas(); loadMonsters(); }, [loadAtlas, loadMonsters]);

  const syncMap = useCallback(() => { if (!draggingRef.current) loadAtlas(); }, [loadAtlas]);
  useDataSync('tactical-map', syncMap);
  useEffect(() => { if (activeScene) drawMap(); }, [activeScene, currentDrawing, measureStart, measureEnd, exploredCells]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => { if (activeScene) drawMap(); });
    ro.observe(container);
    return () => ro.disconnect();
  }, [activeScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheelHandler = (e) => {
      e.preventDefault();
      setZoom(prev => Math.max(0.3, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
    };
    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => canvas.removeEventListener('wheel', wheelHandler);
  }, []);

  useEffect(() => {
    if (isGameMaster || !activeScene?.tokens) return;
    const playerTokens = getPlayerTokens();
    setExploredCells(prev => {
      const newExplored = new Set(prev);
      playerTokens.forEach(token => {
        const visible = getVisibleCells(token.x, token.y, 5);
        visible.forEach(cell => newExplored.add(cell));
      });
      return newExplored;
    });
  }, [activeScene?.tokens, isGameMaster]);

  const getEffectiveGridSize = () => {
    const container = containerRef.current;
    if (!container || !activeScene) return activeScene?.gridSize || 50;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const fit = Math.floor(Math.min(containerW / activeScene.gridWidth, containerH / activeScene.gridHeight));
    return Math.max(fit, 20);
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !activeScene || !container) return;
    try {
      const ctx = canvas.getContext('2d');
      const {
        gridWidth, gridHeight, gridColor, gridOpacity,
        backgroundColor, backgroundImage, backgroundOpacity,
        tokens, drawings,
      } = activeScene;

      const containerW = container.clientWidth;
      const containerH = container.clientHeight;

      const fitGridSize = Math.floor(Math.min(containerW / gridWidth, containerH / gridHeight));
      const gridSize = Math.max(fitGridSize, 20);

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

      // Fog of War (joueurs uniquement)
      if (!isGameMaster) {
        const playerTokens = activeScene.tokens?.filter(t => !t.isEnemy) || [];
        const currentlyVisible = new Set();
        playerTokens.forEach(token => {
          const vis = getVisibleCells(token.x, token.y, 5);
          vis.forEach(c => currentlyVisible.add(c));
        });

        for (let gx = 0; gx < gridWidth; gx++) {
          for (let gy = 0; gy < gridHeight; gy++) {
            const key = `${gx},${gy}`;
            if (currentlyVisible.has(key)) continue;
            const px = gx * gridSize;
            const py = gy * gridSize;
            if (exploredCells.has(key)) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            } else {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            }
            ctx.fillRect(px, py, gridSize, gridSize);
          }
        }
      }

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
    const cacheKey = avatarUrl ? `tok-${avatarUrl}` : null;
    const cached = cacheKey ? window[cacheKey] : null;
    let avatarDrawn = false;

    if (avatarUrl && cached && cached !== 'error' && cached.complete && cached.naturalWidth > 0) {
      ctx.drawImage(cached, x + 3, y + 3, size - 6, size - 6);
      avatarDrawn = true;
    } else if (avatarUrl && cached !== 'error') {
      if (!cached) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { window[cacheKey] = img; drawMap(); };
        img.onerror = () => { window[cacheKey] = 'error'; };
        img.src = avatarUrl;
        window[cacheKey] = img;
      }
    }

    if (!avatarDrawn) {
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      if (token.isEnemy) {
        gradient.addColorStop(0, '#6b2020');
        gradient.addColorStop(1, '#3a1010');
      } else {
        gradient.addColorStop(0, '#1e3a5f');
        gradient.addColorStop(1, '#0f1f33');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 3, y + 3, size - 6, size - 6);

      const initials = token.name ? token.name.substring(0, 2).toUpperCase() : '?';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, size * 0.35)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, cx, cy);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = token.isEnemy ? '#ff3333' : '#33ff33';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (token.hp !== undefined && token.maxHp !== undefined && token.maxHp > 0) {
      const hpPct = Math.max(0, Math.min(1, token.hp / token.maxHp));
      const barW = size - 10;
      const barH = 5;
      const barX = cx - barW / 2;
      const barY = y + size + 3;
      ctx.fillStyle = '#000000';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#333333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpPct <= 0.25 ? '#ff3333' : hpPct <= 0.5 ? '#ff8800' : hpPct <= 0.75 ? '#ffcc00' : '#33cc33';
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, gridSize / 4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(token.name, cx, y + size + 14 + (token.hp !== undefined ? 6 : 0));
    ctx.shadowBlur = 0;

    if (token.hp !== undefined && token.maxHp !== undefined) {
      const pct = token.hp / token.maxHp;
      ctx.fillStyle = pct <= 0.3 ? '#ff3333' : pct <= 0.6 ? '#ffaa00' : '#33ff33';
      ctx.font = `bold ${Math.max(9, gridSize / 5)}px Arial`;
      ctx.shadowBlur = 3;
      ctx.fillText(`${token.hp}/${token.maxHp}`, cx, y - 4);
      ctx.shadowBlur = 0;
    }

    if (token.size > 1 && SIZE_LABELS[token.size]) {
      const bs = Math.max(14, gridSize / 3);
      const bx = x + size - bs + 2;
      const by = y + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx, by, bs, bs);
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bs, bs);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, bs * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SIZE_LABELS[token.size], bx + bs / 2, by + bs / 2);
      ctx.textBaseline = 'alphabetic';
    }

    // Conditions/statuts
    if (token.conditions && token.conditions.length > 0) {
      const maxShow = Math.min(token.conditions.length, 4);
      const iconSize = Math.max(12, gridSize / 4);
      for (let ci = 0; ci < maxShow; ci++) {
        const cond = CONDITIONS.find(c => c.id === token.conditions[ci]);
        if (!cond) continue;
        const ix = x + 2 + ci * (iconSize + 2);
        const iy = y + size - iconSize - 2;
        ctx.fillStyle = cond.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(ix + iconSize / 2, iy + iconSize / 2, iconSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(7, iconSize * 0.5)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cond.icon, ix + iconSize / 2, iy + iconSize / 2);
        ctx.textBaseline = 'alphabetic';
      }
      if (token.conditions.length > 4) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(8, gridSize / 5)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`+${token.conditions.length - 4}`, x + 2 + 4 * (iconSize + 2), y + size - iconSize / 2);
      }
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

  const getGridPos = (pos) => {
    const gs = getEffectiveGridSize();
    return {
      x: Math.floor(pos.x / gs),
      y: Math.floor(pos.y / gs),
    };
  };

  const getVisibleCells = (centerX, centerY, radius = 5) => {
    const cells = new Set();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const cx = centerX + dx;
          const cy = centerY + dy;
          if (cx >= 0 && cy >= 0 && cx < activeScene.gridWidth && cy < activeScene.gridHeight) {
            cells.add(`${cx},${cy}`);
          }
        }
      }
    }
    return cells;
  };

  const getPlayerTokens = () => {
    if (!activeScene?.tokens) return [];
    return activeScene.tokens.filter(t => !t.isEnemy);
  };

  const findTokenAt = (pos) => {
    if (!activeScene) return null;
    const gs = getEffectiveGridSize();
    return activeScene.tokens?.find(t => {
      const tx = t.x * gs;
      const ty = t.y * gs;
      const size = t.size * gs;
      return pos.x >= tx && pos.x <= tx + size && pos.y >= ty && pos.y <= ty + size;
    });
  };

  const handleMouseDown = (e) => {
    if (!activeScene) return;
    if (contextMenu) { setContextMenu(null); return; }
    const pos = getCanvasPos(e);
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }
    if (selectedTool === 'measure') { setMeasuring(true); setMeasureStart(pos); setMeasureEnd(pos); return; }
    if (!isGameMaster) return;
    if (selectedTool === 'token') { setTokenPosition(getGridPos(pos)); setShowTokenCreator(true); return; }
    if (selectedTool === 'delete') {
      const t = findTokenAt(pos);
      if (t && confirm(`Supprimer "${t.name}" ?`)) removeToken(t.id);
      return;
    }
    if (selectedTool === 'select') {
      const t = findTokenAt(pos);
      if (t) {
        draggingRef.current = true;
        setDraggingToken(t);
        setDragOffset({ x: pos.x - t.x * getEffectiveGridSize(), y: pos.y - t.y * getEffectiveGridSize() });
        return;
      }
    }
    if (['line', 'rect', 'circle'].includes(selectedTool)) {
      setIsDrawing(true);
      setDrawStart({ x: pos.x / getEffectiveGridSize(), y: pos.y / getEffectiveGridSize() });
    }
  };

  const handleMouseMove = (e) => {
    if (!activeScene) return;
    const pos = getCanvasPos(e);

    if (!isPanning && !measuring && !draggingToken && !isDrawing) {
      const t = findTokenAt(pos);
      if (t) {
        setHoveredToken(t);
        setTooltipPos({ x: e.clientX, y: e.clientY });
      } else {
        if (hoveredToken) setHoveredToken(null);
      }
    }

    if (isPanning && panStart) {
      setPanOffset(prev => ({ x: prev.x + e.clientX - panStart.x, y: prev.y + e.clientY - panStart.y }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    if (measuring) { setMeasureEnd(pos); return; }
    if (draggingToken) {
      const newX = Math.max(0, Math.floor((pos.x - dragOffset.x) / getEffectiveGridSize()));
      const newY = Math.max(0, Math.floor((pos.y - dragOffset.y) / getEffectiveGridSize()));
      setActiveScene(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === draggingToken.id ? { ...t, x: newX, y: newY } : t) }));
      return;
    }
    if (isDrawing && drawStart && isGameMaster) {
      const gx = pos.x / getEffectiveGridSize();
      const gy = pos.y / getEffectiveGridSize();
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
      const updated = activeScene.tokens.find(t => t.id === draggingToken.id);
      const finalX = updated ? updated.x : draggingToken.x;
      const finalY = updated ? updated.y : draggingToken.y;
      await apiCall(`/scene/${activeScene.id}/token/${draggingToken.id}/move`, 'PUT', { x: finalX, y: finalY });
      setDraggingToken(null);
      draggingRef.current = false;
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

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!isGameMaster || !activeScene) return;
    const pos = getCanvasPos(e);
    const t = findTokenAt(pos);
    if (t) {
      setContextMenu({ token: t, x: e.clientX, y: e.clientY });
    }
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
    setContextMenu(null);
  };

  const updateTokenProp = async (tokenId, updates) => {
    await apiCall(`/scene/${activeScene.id}/token/${tokenId}`, 'PUT', updates);
    await loadAtlas();
    setContextMenu(null);
  };

  const toggleCondition = async (tokenId, conditionId) => {
    const token = activeScene.tokens.find(t => t.id === tokenId);
    if (!token) return;
    const current = token.conditions || [];
    const newConditions = current.includes(conditionId)
      ? current.filter(c => c !== conditionId)
      : [...current, conditionId];
    await updateTokenProp(tokenId, { conditions: newConditions });
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
          {!isGameMaster && (
            <button
              onClick={() => setSelectedTool(selectedTool === 'measure' ? 'select' : 'measure')}
              title="Mesurer"
              className={`px-2 py-1 rounded text-xs transition ${selectedTool === 'measure' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Mesurer
            </button>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setZoom(p => Math.max(0.3, p - 0.1))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">−</button>
            <span className="text-gray-300 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(p => Math.min(3, p + 0.1))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">+</button>
            <button onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm" title="Reset vue">↻</button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-950 relative" style={{ touchAction: 'none' }}>
          <div style={{ transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: 'top left', width: '100%', height: '100%' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); setHoveredToken(null); }}
              onContextMenu={handleContextMenu}

              className={`${isGameMaster ? 'cursor-crosshair' : 'cursor-default'} block w-full h-full`}
            />
          </div>

          {hoveredToken && !contextMenu && !draggingToken && (
            <div className="fixed z-50 pointer-events-none bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl max-w-xs"
              style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 10 }}>
              <p className="text-white font-bold text-sm mb-1">{hoveredToken.name}</p>
              <div className="space-y-0.5 text-xs">
                {hoveredToken.hp !== undefined && hoveredToken.maxHp !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">HP:</span>
                    <span className={`font-bold ${(hoveredToken.hp / hoveredToken.maxHp) <= 0.25 ? 'text-red-400' : (hoveredToken.hp / hoveredToken.maxHp) <= 0.5 ? 'text-orange-400' : 'text-green-400'}`}>
                      {hoveredToken.hp}/{hoveredToken.maxHp}
                    </span>
                  </div>
                )}
                {hoveredToken.ac !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">CA:</span>
                    <span className="text-blue-400 font-bold">{hoveredToken.ac}</span>
                  </div>
                )}
                {hoveredToken.size > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Taille:</span>
                    <span className="text-amber-400 font-bold">{hoveredToken.size === 2 ? 'Grand' : hoveredToken.size === 3 ? 'Enorme' : 'Colossal'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Camp:</span>
                  <span className={`font-bold ${hoveredToken.isEnemy ? 'text-red-400' : 'text-green-400'}`}>{hoveredToken.isEnemy ? 'Ennemi' : 'Allie'}</span>
                </div>
                {hoveredToken.conditions && hoveredToken.conditions.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    <span className="text-gray-400">Etats:</span>
                    {hoveredToken.conditions.map(cId => {
                      const c = CONDITIONS.find(x => x.id === cId);
                      return c ? (
                        <span key={cId} className="px-1 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: c.color, color: '#fff' }}>
                          {c.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {contextMenu && isGameMaster && (
            <div className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[180px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}>
              <div className="px-3 py-2 border-b border-gray-700">
                <p className="text-white font-bold text-sm truncate">{contextMenu.token.name}</p>
              </div>
              <button onClick={() => updateTokenProp(contextMenu.token.id, { isEnemy: !contextMenu.token.isEnemy })}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition">
                {contextMenu.token.isEnemy ? '🟢 Marquer Allié' : '🔴 Marquer Ennemi'}
              </button>
              <div className="px-3 py-2 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Taille</p>
                <div className="flex gap-1">
                  {[{s:1,l:'M'},{s:2,l:'G'},{s:3,l:'E'},{s:4,l:'C'}].map(({s,l}) => (
                    <button key={s} onClick={() => updateTokenProp(contextMenu.token.id, { size: s })}
                      className={`flex-1 px-2 py-1 rounded text-xs font-bold transition ${contextMenu.token.size === s ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-3 py-2 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Conditions</p>
                <div className="flex gap-1 flex-wrap">
                  {CONDITIONS.map(cond => {
                    const has = (contextMenu.token.conditions || []).includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        onClick={() => toggleCondition(contextMenu.token.id, cond.id)}
                        title={cond.label}
                        className={`px-1.5 py-0.5 rounded text-xs font-bold transition ${has ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: cond.color, color: '#fff' }}
                      >
                        {cond.icon}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => { if (confirm(`Supprimer "${contextMenu.token.name}" ?`)) removeToken(contextMenu.token.id); }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900 hover:bg-opacity-30 transition border-t border-gray-700">
                🗑️ Supprimer
              </button>
              <button onClick={() => setContextMenu(null)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-700 transition border-t border-gray-700">
                Fermer
              </button>
            </div>
          )}
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
          monsters={monsters}
          position={tokenPosition}
          onCreateToken={addToken}
          onCancel={() => setShowTokenCreator(false)}
        />
      )}

    </div>
  );
}
