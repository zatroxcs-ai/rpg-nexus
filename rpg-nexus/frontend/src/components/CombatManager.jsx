import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useDataSync from '../hooks/useDataSync';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;
const authHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const STAT_LABELS = { strength: 'FOR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'SAG', charisma: 'CHA' };
const STAT_KEYS = Object.keys(STAT_LABELS);

const CONDITIONS = [
  { name: 'Aveugle', emoji: '\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F', color: 'bg-gray-500', text: 'text-gray-100' },
  { name: 'Charm\u00e9', emoji: '\uD83D\uDC95', color: 'bg-pink-500', text: 'text-pink-100' },
  { name: 'Assourdi', emoji: '\uD83E\uDDBB', color: 'bg-gray-500', text: 'text-gray-100' },
  { name: 'Effray\u00e9', emoji: '\uD83D\uDE28', color: 'bg-purple-600', text: 'text-purple-100' },
  { name: 'Agripp\u00e9', emoji: '\u270A', color: 'bg-yellow-600', text: 'text-yellow-100' },
  { name: 'Incapacit\u00e9', emoji: '\uD83D\uDEAB', color: 'bg-red-600', text: 'text-red-100' },
  { name: 'Invisible', emoji: '\uD83D\uDC7B', color: 'bg-blue-400 bg-opacity-60', text: 'text-blue-100' },
  { name: 'Paralys\u00e9', emoji: '\u26A1', color: 'bg-red-600', text: 'text-red-100' },
  { name: 'P\u00e9trifi\u00e9', emoji: '\uD83E\uDEA8', color: 'bg-gray-500', text: 'text-gray-100' },
  { name: 'Empoisonn\u00e9', emoji: '\u2620\uFE0F', color: 'bg-green-600', text: 'text-green-100' },
  { name: 'A terre', emoji: '\uD83E\uDDD8', color: 'bg-amber-800', text: 'text-amber-100' },
  { name: 'Entrav\u00e9', emoji: '\u26D3\uFE0F', color: 'bg-orange-600', text: 'text-orange-100' },
  { name: '\u00c9tourdi', emoji: '\uD83D\uDCAB', color: 'bg-yellow-500', text: 'text-yellow-100' },
  { name: 'Inconscient', emoji: '\uD83D\uDE34', color: 'bg-red-900', text: 'text-red-100' },
];

const mod = (val) => {
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

const hpPercent = (hp, maxHp) => maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
const hpColor = (pct) => pct <= 25 ? 'bg-red-500' : pct <= 50 ? 'bg-orange-500' : pct <= 75 ? 'bg-yellow-500' : 'bg-green-500';

const toFullUrl = (url) => {
  if (!url) return null;
  // Remplace les URLs localhost stockées en BDD par l'URL de production
  if (url.startsWith('http://localhost:3000')) {
    return url.replace('http://localhost:3000', import.meta.env.VITE_API_URL || 'http://localhost:3000');
  }
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;
};

export default function CombatManager({ gameId, isGameMaster, triggerCssAnimation }) {
  const [combats, setCombats] = useState([]);
  const [activeCombatId, setActiveCombatId] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [combatName, setCombatName] = useState('');
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedAction, setSelectedAction] = useState(0);
  const [attackResult, setAttackResult] = useState(null);
  const [damageAmount, setDamageAmount] = useState('');
  const [healAmount, setHealAmount] = useState('');
  const [dmTarget, setDmTarget] = useState(null);
  const [viewMode, setViewMode] = useState('active');
  const [finishedCombats, setFinishedCombats] = useState([]);
  const [selectedHistoryCombat, setSelectedHistoryCombat] = useState(null);
  const [participantConditions, setParticipantConditions] = useState({});
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(null);
  const [participantItems, setParticipantItems] = useState({});
  const logRef = useRef(null);
  const { user } = useAuth();

  const combat = combats.find(c => c.id === activeCombatId) || null;

  const playCombatAnim = (effect, position) => {
    if (!triggerCssAnimation) return;
    const durations = {
      explosion: 2000, fireball: 3000, heal: 2000, lightning: 1500,
      shield: 2500, poison: 3000, freeze: 2000, buff: 2000,
      critical: 1500, teleport: 2000, smoke: 3000, sparkles: 2500,
    };
    triggerCssAnimation({
      id: Date.now().toString(),
      effect,
      position: position || { x: 50, y: 50 },
      duration: durations[effect] || 2000,
    });
  };

  useEffect(() => { loadAll(); }, [gameId]);

  const syncCombat = useCallback(() => { loadAll(); }, [gameId]);
  useDataSync('combat', syncCombat);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [combat?.log]);

  useEffect(() => {
    const participants = combat?.participants || [];
    if (participants.length > 0) loadParticipantItems(participants);
  }, [combat?.id, combat?.participants?.length]);

  const loadAll = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetch(`${API}/combat/game/${gameId}/active`, { headers: authHeader() }),
      fetch(`${API}/character/game/${gameId}`, { headers: authHeader() }),
      fetch(`${API}/monster/game/${gameId}`, { headers: authHeader() }),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value.ok) {
      try {
        const data = await results[0].value.json();
        const list = Array.isArray(data) ? data : [];
        setCombats(list);
        if (list.length > 0 && !activeCombatId) setActiveCombatId(list[0].id);
      } catch { setCombats([]); }
    }

    if (results[1].status === 'fulfilled' && results[1].value.ok) {
      try {
        const data = await results[1].value.json();
        setCharacters(Array.isArray(data) ? data : []);
      } catch { setCharacters([]); }
    }

    if (results[2].status === 'fulfilled' && results[2].value.ok) {
      try {
        const data = await results[2].value.json();
        setMonsters(Array.isArray(data) ? data : []);
      } catch { setMonsters([]); }
    }

    setLoading(false);
  };

  const loadParticipantItems = async (participantsList) => {
    const map = {};
    for (const p of participantsList) {
      const type = p.type === 'MONSTER' ? 'monster' : 'character';
      const entityId = p.type === 'MONSTER' ? p.monsterId : p.characterId;
      if (!entityId) continue;
      try {
        const res = await fetch(`${API}/item/entity/${type}/${entityId}`, { headers: authHeader() });
        if (res.ok) {
          const data = await res.json();
          map[p.id] = Array.isArray(data) ? data : [];
        } else {
          map[p.id] = [];
        }
      } catch { map[p.id] = []; }
    }
    setParticipantItems(prev => ({ ...prev, ...map }));
  };

  const useItem = async (itemId, participantId) => {
    try {
      await fetch(`${API}/item/${itemId}/use`, { method: 'PUT', headers: authHeader() });
      const p = (combat?.participants || []).find(x => x.id === participantId);
      if (p) {
        const type = p.type === 'MONSTER' ? 'monster' : 'character';
        const entityId = p.type === 'MONSTER' ? p.monsterId : p.characterId;
        const res = await fetch(`${API}/item/entity/${type}/${entityId}`, { headers: authHeader() });
        if (res.ok) {
          const data = await res.json();
          setParticipantItems(prev => ({ ...prev, [participantId]: Array.isArray(data) ? data : [] }));
        }
      }
    } catch (e) { console.error(e); }
  };

  const deactivateItem = async (itemId, participantId) => {
    try {
      await fetch(`${API}/item/${itemId}/deactivate`, { method: 'PUT', headers: authHeader() });
      const p = (combat?.participants || []).find(x => x.id === participantId);
      if (p) {
        const type = p.type === 'MONSTER' ? 'monster' : 'character';
        const entityId = p.type === 'MONSTER' ? p.monsterId : p.characterId;
        const res = await fetch(`${API}/item/entity/${type}/${entityId}`, { headers: authHeader() });
        if (res.ok) {
          const data = await res.json();
          setParticipantItems(prev => ({ ...prev, [participantId]: Array.isArray(data) ? data : [] }));
        }
      }
    } catch (e) { console.error(e); }
  };

  const refreshCombats = async () => {
    try {
      const res = await fetch(`${API}/combat/game/${gameId}/active`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setCombats(list);
      }
    } catch {}
  };

  const loadFinishedCombats = async () => {
    try {
      const res = await fetch(`${API}/combat/game/${gameId}/finished`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setFinishedCombats(Array.isArray(data) ? data : []);
      }
    } catch { setFinishedCombats([]); }
  };

  const createCombat = async () => {
    try {
      const res = await fetch(`${API}/combat/game/${gameId}`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ name: combatName.trim() || 'Combat' }),
      });
      const data = await res.json();
      if (data.id) {
        await refreshCombats();
        setActiveCombatId(data.id);
        setCombatName('');
      } else {
        alert(data.message || 'Erreur');
      }
    } catch (e) { alert('Erreur creation combat'); }
  };

  const addCharacter = async (characterId) => {
    if (!combat) return;
    try {
      const res = await fetch(`${API}/combat/${combat.id}/add-character`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ characterId }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.message || 'Erreur'); return; }
      const data = await res.json();
      if (data.participant) {
        setAttackResult({
          type: 'initiative',
          name: data.participant.name,
          roll: data.initiativeRoll,
          mod: data.dexMod,
          total: data.total,
        });
        await refreshCombats();
      }
    } catch (e) { console.error(e); }
  };

  const addMonster = async (monsterId) => {
    if (!combat) return;
    try {
      const res = await fetch(`${API}/combat/${combat.id}/add-monster`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ monsterId }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.message || 'Erreur'); return; }
      const data = await res.json();
      if (data.participant) {
        setAttackResult({
          type: 'initiative',
          name: data.participant.name,
          roll: data.initiativeRoll,
          mod: data.dexMod,
          total: data.total,
        });
        await refreshCombats();
      }
    } catch (e) { console.error(e); }
  };

  const removeParticipant = async (participantId) => {
    if (!combat) return;
    try {
      await fetch(`${API}/combat/${combat.id}/participant/${participantId}`, {
        method: 'DELETE', headers: authHeader(),
      });
      await refreshCombats();
    } catch (e) { console.error(e); }
  };

  const nextTurn = async () => {
    if (!combat) return;
    try {
      const res = await fetch(`${API}/combat/${combat.id}/next-turn`, {
        method: 'POST', headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.autoAttacks && data.autoAttacks.length > 0) {
          setAttackResult({ type: 'autoAttacks', attacks: data.autoAttacks });
          const hasHit = data.autoAttacks.some(a => a.hits);
          const hasCrit = data.autoAttacks.some(a => a.isCritical);
          const hasDeath = data.autoAttacks.some(a => a.targetDied);
          if (hasCrit) {
            playCombatAnim('critical');
          } else if (hasHit) {
            playCombatAnim('explosion', { x: 50, y: 50 });
          }
          if (hasDeath) {
            setTimeout(() => playCombatAnim('smoke', { x: 50, y: 60 }), 1000);
          }
        }
        await fetch(`${API}/item/game/${gameId}/tick-all`, { method: 'PUT', headers: authHeader() });
        await refreshCombats();
        const participants = combat?.participants || [];
        if (participants.length > 0) loadParticipantItems(participants);
      }
    } catch (e) { console.error(e); }
  };

  const toggleAutoMode = async () => {
    if (!combat) return;
    try {
      const res = await fetch(`${API}/combat/${combat.id}/toggle-auto`, {
        method: 'POST', headers: authHeader(),
      });
      if (res.ok) await refreshCombats();
    } catch (e) { console.error(e); }
  };

  const performAttack = async () => {
    if (!combat || !selectedAttacker || !selectedTarget) return;
    try {
      const res = await fetch(`${API}/combat/${combat.id}/attack`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({
          attackerId: selectedAttacker,
          targetId: selectedTarget,
          actionIndex: selectedAction,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Erreur lors de l\'attaque');
        await refreshCombats();
        return;
      }
      const data = await res.json();
      if (data.combat) {
        setAttackResult({ type: 'attack', ...data.attackResult });
        const r = data.attackResult;
        if (r) {
          if (r.isCritical) {
            playCombatAnim('critical');
          } else if (r.isFumble) {
            playCombatAnim('smoke', { x: 30, y: 50 });
          } else if (r.hits) {
            playCombatAnim('explosion');
          }
          if (r.targetDied) {
            setTimeout(() => playCombatAnim('smoke', { x: 70, y: 60 }), 800);
          }
        }
        await refreshCombats();
      }
    } catch (e) { console.error(e); }
  };

  const applyDamage = async () => {
    if (!combat || !dmTarget || !damageAmount) return;
    try {
      const res = await fetch(`${API}/combat/${combat.id}/damage`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ targetId: dmTarget, amount: parseInt(damageAmount) }),
      });
      if (res.ok) {
        playCombatAnim('explosion', { x: 60, y: 40 });
        await refreshCombats();
      }
      setDamageAmount('');
      setDmTarget(null);
    } catch (e) { console.error(e); }
  };

  const applyHeal = async () => {
    if (!combat || !dmTarget || !healAmount) return;
    try {
      const res = await fetch(`${API}/combat/${combat.id}/heal`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ targetId: dmTarget, amount: parseInt(healAmount) }),
      });
      if (res.ok) {
        playCombatAnim('heal', { x: 40, y: 40 });
        await refreshCombats();
      }
      setHealAmount('');
      setDmTarget(null);
    } catch (e) { console.error(e); }
  };

  const endCombat = async (combatId) => {
    if (!confirm('Terminer ce combat ?')) return;
    try {
      await fetch(`${API}/combat/${combatId}/end`, {
        method: 'POST', headers: authHeader(),
      });
      setAttackResult(null);
      setSelectedAttacker(null);
      setSelectedTarget(null);
      await refreshCombats();
      if (activeCombatId === combatId) {
        const remaining = combats.filter(c => c.id !== combatId);
        setActiveCombatId(remaining.length > 0 ? remaining[0].id : null);
      }
      loadFinishedCombats();
    } catch (e) { console.error(e); }
  };

  const toggleCondition = (participantId, conditionName) => {
    setParticipantConditions(prev => {
      const current = prev[participantId] || [];
      const exists = current.includes(conditionName);
      const updated = exists ? current.filter(c => c !== conditionName) : [...current, conditionName];
      return { ...prev, [participantId]: updated };
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-xl">Chargement...</div>
  );

  // ── VUE HISTORIQUE ──
  if (viewMode === 'history') {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        <div className="p-4 border-b border-gray-700 flex items-center gap-4">
          <button onClick={() => { setViewMode('active'); setSelectedHistoryCombat(null); }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition">
            &larr; Retour aux combats
          </button>
          <h2 className="text-white font-bold text-lg">Historique des combats</h2>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Liste des combats termines */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{finishedCombats.length} combat(s) termine(s)</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {finishedCombats.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">Aucun combat termine.</p>
              ) : (
                finishedCombats.map(fc => {
                  const log = fc.log || [];
                  const totalDmg = log.filter(e => e.hits).reduce((s, e) => s + (e.damageTotal || 0), 0);
                  const deaths = log.filter(e => e.targetDied).length;
                  return (
                    <button key={fc.id}
                      onClick={() => setSelectedHistoryCombat(fc)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedHistoryCombat?.id === fc.id
                          ? 'border-red-500 bg-red-900 bg-opacity-20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}>
                      <p className="text-white font-bold text-sm">{fc.name}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>{fc.round} rounds</span>
                        <span>{fc.participants?.length || 0} participants</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-red-400">{totalDmg} degats</span>
                        {deaths > 0 && <span className="text-red-500">{deaths} mort(s)</span>}
                        <span className="text-gray-500">{log.length} actions</span>
                      </div>
                      {fc.createdAt && (
                        <p className="text-xs text-gray-500 mt-1">{new Date(fc.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail du combat selectionne */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedHistoryCombat ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>Selectionnez un combat pour voir le detail</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-bold text-lg">{selectedHistoryCombat.name}</h3>
                  <div className="flex gap-4 mt-1 text-sm text-gray-400">
                    <span className="text-yellow-400 font-bold">{selectedHistoryCombat.round} rounds</span>
                    <span>{selectedHistoryCombat.participants?.length || 0} participants</span>
                  </div>
                </div>

                {/* Participants du combat */}
                <div className="p-4 border-b border-gray-700">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Participants</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedHistoryCombat.participants || []).map(p => (
                      <div key={p.id} className={`px-3 py-2 rounded-lg border text-sm ${
                        p.isAlive ? 'bg-gray-700 border-gray-600' : 'bg-gray-800 border-gray-700 opacity-60'
                      }`}>
                        <div className="flex items-center gap-2">
                          {p.avatar ? (
                            <img src={toFullUrl(p.avatar)} alt={p.name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm">{p.type === 'MONSTER' ? '\uD83D\uDC32' : '\u2694\uFE0F'}</span>
                          )}
                          <span className={`font-semibold ${p.isAlive ? 'text-white' : 'text-gray-500 line-through'}`}>{p.name}</span>
                          <span className={`text-xs ${p.isAlive ? 'text-green-400' : 'text-red-400'}`}>
                            {p.hp}/{p.maxHp} HP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Journal complet */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                    <h4 className="text-white font-semibold text-sm">Journal complet</h4>
                    <span className="text-xs text-gray-500">{(selectedHistoryCombat.log || []).length} action(s)</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {(selectedHistoryCombat.log || []).length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-8">Aucune action enregistree.</p>
                    ) : (
                      (selectedHistoryCombat.log || []).map((entry, i) => (
                        <div key={i} className={`text-sm p-3 rounded-lg ${
                          entry.isCritical ? 'bg-yellow-900 bg-opacity-20 border border-yellow-800' :
                          entry.isFumble ? 'bg-gray-800 border border-gray-700' :
                          entry.hits ? 'bg-red-900 bg-opacity-10 border border-red-900' : 'bg-gray-800 border border-gray-700'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500 font-mono">R{entry.round}</span>
                            <span className="text-white font-semibold">{entry.attackerName}</span>
                            <span className="text-gray-500">&rarr;</span>
                            <span className="text-white font-semibold">{entry.targetName}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-orange-400 text-xs">{entry.actionName}</span>
                            <span className="text-cyan-400 text-xs font-bold">{entry.successRate ?? 50}%</span>
                            <span className="text-gray-400 text-xs">d100 = {entry.attackRoll} {entry.isCritical ? '' : entry.isFumble ? '' : entry.hits ? `<= ${entry.successRate}%` : `> ${entry.successRate}%`}</span>
                            <span className={`text-xs font-bold ${
                              entry.isCritical ? 'text-yellow-400' : entry.isFumble ? 'text-gray-500' : entry.hits ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {entry.isCritical ? 'CRITIQUE !' : entry.isFumble ? 'FUMBLE !' : entry.hits ? 'TOUCHE' : 'RATE'}
                            </span>
                            {entry.hits && (
                              <span className="text-red-400 text-xs font-bold">{entry.damageTotal} degats ({entry.damageFormula}{entry.isCritical ? ' x2 des' : ''})</span>
                            )}
                            {entry.targetDied && <span className="text-red-500 text-xs font-bold animate-pulse">MORT</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── VUE JOUEUR MOBILE ──
  if (!isGameMaster) {
    // Find which characters belong to this player
    const myCharacterIds = characters.filter(c => c.ownerId === user?.id).map(c => c.id);
    // Filter combats where the player has a participating character
    const myCombats = combats.filter(cb =>
      (cb.participants || []).some(p => p.characterId && myCharacterIds.includes(p.characterId))
    );
    const playerCombat = myCombats.find(c => c.id === activeCombatId) || myCombats[0] || null;
    const playerParticipants = playerCombat?.participants || [];
    const playerAlive = playerParticipants.filter(p => p.isAlive);
    const playerCurrentTurn = playerAlive[playerCombat?.currentTurn ?? 0] || null;
    const playerLog = (playerCombat?.log || []).slice(-20);
    // Find the player's own participant(s) in this combat, enriched with character actions
    const myParticipants = playerParticipants
      .filter(p => p.characterId && myCharacterIds.includes(p.characterId))
      .map(p => {
        const char = characters.find(c => c.id === p.characterId);
        const charActions = (char?.data?._actions || []);
        const participantActions = Array.isArray(p.actions) ? p.actions : [];
        return { ...p, actions: participantActions.length > 0 ? participantActions : charActions };
      });

    // History sub-view for player (mobile-friendly)
    if (viewMode === 'history') {
      return (
        <div className="h-full flex flex-col bg-gray-900">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <button onClick={() => { setViewMode('active'); setSelectedHistoryCombat(null); }}
              className="min-h-[44px] min-w-[44px] px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition">
              &larr; Retour
            </button>
            <h2 className="text-white font-bold text-lg">Historique</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {finishedCombats.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">Aucun combat termine.</p>
            ) : (
              finishedCombats.map(fc => {
                const log = fc.log || [];
                const totalDmg = log.filter(e => e.hits).reduce((s, e) => s + (e.damageTotal || 0), 0);
                const deaths = log.filter(e => e.targetDied).length;
                const isSelected = selectedHistoryCombat?.id === fc.id;
                return (
                  <div key={fc.id} className="space-y-2">
                    <button
                      onClick={() => setSelectedHistoryCombat(isSelected ? null : fc)}
                      className={`w-full text-left p-4 rounded-xl border transition min-h-[44px] ${
                        isSelected
                          ? 'border-red-500 bg-red-900 bg-opacity-20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}>
                      <p className="text-white font-bold text-sm">{fc.name}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>{fc.round} rounds</span>
                        <span>{fc.participants?.length || 0} participants</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-red-400">{totalDmg} degats</span>
                        {deaths > 0 && <span className="text-red-500">{deaths} mort(s)</span>}
                        <span className="text-gray-500">{log.length} actions</span>
                      </div>
                    </button>
                    {isSelected && (
                      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                          <h4 className="text-white font-semibold text-sm">Journal</h4>
                          <span className="text-xs text-gray-500">{log.length} action(s)</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                          {log.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-4">Aucune action.</p>
                          ) : (
                            log.map((entry, i) => (
                              <div key={i} className={`text-sm p-3 rounded-lg ${
                                entry.isCritical ? 'bg-yellow-900 bg-opacity-20 border border-yellow-800' :
                                entry.hits ? 'bg-red-900 bg-opacity-10 border border-red-900' : 'bg-gray-800 border border-gray-700'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500 font-mono">R{entry.round}</span>
                                  <span className="text-white font-semibold">{entry.attackerName}</span>
                                  <span className="text-gray-500">&rarr;</span>
                                  <span className="text-white font-semibold">{entry.targetName}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-orange-400 text-xs">{entry.actionName}</span>
                                  <span className={`text-xs font-bold ${
                                    entry.isCritical ? 'text-yellow-400' : entry.isFumble ? 'text-gray-500' : entry.hits ? 'text-red-400' : 'text-blue-400'
                                  }`}>
                                    {entry.isCritical ? 'CRITIQUE' : entry.isFumble ? 'FUMBLE' : entry.hits ? 'TOUCHE' : 'RATE'}
                                  </span>
                                  {entry.hits && <span className="text-red-400 text-xs font-bold">{entry.damageTotal} degats</span>}
                                  {entry.targetDied && <span className="text-red-500 text-xs font-bold">MORT</span>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // No combats the player participates in
    if (myCombats.length === 0) {
      return (
        <div className="h-full flex flex-col bg-gray-900">
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-6xl mb-4">&#x2694;&#xFE0F;</div>
            <h2 className="text-xl font-bold text-white mb-2">Aucun combat en cours</h2>
            <p className="text-gray-400 mb-6">En attente du MJ pour lancer un combat avec votre personnage...</p>
            <button onClick={() => { loadFinishedCombats(); setViewMode('history'); }}
              className="min-h-[44px] px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-semibold transition">
              Voir l'historique des combats
            </button>
          </div>
        </div>
      );
    }

    // Sync activeCombatId to a valid player combat if needed
    if (playerCombat && activeCombatId !== playerCombat.id) {
      setActiveCombatId(playerCombat.id);
    }

    return (
      <div className="h-full flex flex-col bg-gray-900 overflow-y-auto">

        {/* ── Combat selector tabs ── */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {myCombats.map(c => (
              <button key={c.id}
                onClick={() => { setActiveCombatId(c.id); setAttackResult(null); }}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                  playerCombat?.id === c.id
                    ? 'bg-red-700 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}>
                {c.name}
              </button>
            ))}
            <button onClick={() => { loadFinishedCombats(); setViewMode('history'); }}
              className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold bg-gray-700 text-gray-400 hover:bg-gray-600 whitespace-nowrap transition">
              Historique
            </button>
          </div>
        </div>

        {playerCombat && (
          <div className="flex flex-col gap-4 p-4">

            {/* ── Round / Turn info ── */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h2 className="text-white font-bold text-lg truncate mb-1">{playerCombat.name}</h2>
              <div className="flex gap-3 text-sm">
                <span className="text-yellow-400 font-bold">Round {playerCombat.round}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-300">Tour {(playerCombat.currentTurn || 0) + 1}/{playerAlive.length || 1}</span>
              </div>
              {playerCurrentTurn && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-yellow-300 text-sm font-semibold">C'est au tour de {playerCurrentTurn.name}</span>
                </div>
              )}
            </div>

            {/* ── Initiative order (compact, read-only) ── */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-3 border-b border-gray-700">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Ordre d'initiative</p>
              </div>
              <div className="divide-y divide-gray-700">
                {playerParticipants.map(p => {
                  const pct = hpPercent(p.hp, p.maxHp);
                  const isCurrent = playerCurrentTurn?.id === p.id;
                  const isMonster = p.type === 'MONSTER';
                  return (
                    <div key={p.id}
                      className={`flex items-center gap-3 p-3 min-h-[52px] ${
                        !p.isAlive ? 'opacity-40'
                          : isCurrent ? 'bg-yellow-900 bg-opacity-20'
                          : ''
                      }`}>
                      <div className="relative flex-shrink-0">
                        {p.avatar ? (
                          <img src={toFullUrl(p.avatar)} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-gray-500" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 ${isMonster ? 'bg-red-900 border-red-700' : 'bg-indigo-900 border-indigo-700'}`}>
                            {isMonster ? '\uD83D\uDC32' : '\u2694\uFE0F'}
                          </div>
                        )}
                        {isCurrent && p.isAlive && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-gray-800 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm truncate ${!p.isAlive ? 'line-through text-gray-500' : 'text-white'}`}>{p.name}</p>
                          <span className="text-xs text-yellow-400 font-bold bg-yellow-900 bg-opacity-40 px-1.5 rounded">{p.initiative}</span>
                          {(participantItems[p.id] || []).some(it => it.isConsumable && it.isActive) && (
                            <span className="text-[10px] text-cyan-300 bg-cyan-900 bg-opacity-50 px-1 rounded">
                              {(participantItems[p.id] || []).filter(it => it.isConsumable && it.isActive).length} effet(s)
                            </span>
                          )}
                        </div>
                        {p.isAlive ? (
                          <div className="mt-1">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>HP {p.hp}/{p.maxHp}</span>
                              <span>CA {p.ac}</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-1.5 mt-0.5">
                              <div className={`h-1.5 rounded-full transition-all ${hpColor(pct)}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-red-400 mt-0.5">Mort</p>
                        )}
                        {/* Conditions badges */}
                        {(participantConditions[p.id] || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(participantConditions[p.id] || []).map(cName => {
                              const cond = CONDITIONS.find(c => c.name === cName);
                              if (!cond) return null;
                              return (
                                <span key={cName}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cond.color} ${cond.text}`}>
                                  <span>{cond.emoji}</span>
                                  <span>{cond.name}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Player action panel (when it's my turn) ── */}
            {playerCurrentTurn && myParticipants.some(mp => mp.id === playerCurrentTurn.id) && playerCurrentTurn.isAlive && (
              <div className="bg-gray-800 rounded-xl border-2 border-yellow-600 overflow-hidden">
                <div className="p-3 border-b border-yellow-700 bg-yellow-900 bg-opacity-20">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                    <p className="text-yellow-300 font-bold text-sm">C'est votre tour !</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* Attack */}
                  {(() => {
                    const mp = myParticipants.find(p => p.id === playerCurrentTurn.id);
                    const actions = (mp?.actions || []);
                    const targets = playerParticipants.filter(p => p.isAlive && p.id !== mp.id);
                    return (
                      <>
                        {actions.length === 0 && (
                          <div className="text-center py-3">
                            <p className="text-gray-400 text-sm">Aucune action disponible.</p>
                            <p className="text-gray-500 text-xs mt-1">Demandez au MJ d'ajouter des actions a votre personnage.</p>
                          </div>
                        )}
                        {actions.length > 0 && targets.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Attaquer</p>
                            <select
                              id="player-target-select"
                              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm min-h-[44px]"
                              defaultValue=""
                            >
                              <option value="" disabled>Choisir une cible...</option>
                              {targets.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.hp}/{t.maxHp} HP, CA {t.ac})
                                </option>
                              ))}
                            </select>
                            <div className="grid grid-cols-1 gap-2">
                              {actions.map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={async () => {
                                    const targetId = document.getElementById('player-target-select')?.value;
                                    if (!targetId) { alert('Choisissez une cible'); return; }
                                    try {
                                      const res = await fetch(`${API}/combat/${playerCombat.id}/player-attack`, {
                                        method: 'POST',
                                        headers: authHeader(),
                                        body: JSON.stringify({ participantId: mp.id, targetId, actionIndex: idx }),
                                      });
                                      const json = await res.json();
                                      if (!res.ok) throw new Error(json.message || 'Erreur');
                                      if (json.autoAttacks && json.autoAttacks.length > 0) {
                                        setAttackResult({ type: 'autoAttacks', attacks: json.autoAttacks, playerAttack: json.attackResult });
                                      } else {
                                        setAttackResult(json.attackResult);
                                      }
                                      loadAll();
                                    } catch (e) {
                                      alert(e.message || 'Erreur');
                                    }
                                  }}
                                  className="flex items-center gap-3 px-4 py-3 bg-red-900 bg-opacity-30 active:bg-red-800 rounded-xl border border-red-700 transition min-h-[52px] text-left"
                                >
                                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-white font-semibold text-sm">{action.name || `Action ${idx + 1}`}</span>
                                    <div className="flex gap-2 text-xs">
                                      {action.damage && <span className="text-red-400">{action.damage}</span>}
                                      {action.successRate && <span className="text-gray-400">{action.successRate}% reussite</span>}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Flee */}
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Autres actions</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={async () => {
                                if (!confirm('Tenter de fuir le combat ?')) return;
                                try {
                                  const res = await fetch(`${API}/combat/${playerCombat.id}/player-flee`, {
                                    method: 'POST',
                                    headers: authHeader(),
                                    body: JSON.stringify({ participantId: mp.id }),
                                  });
                                  const json = await res.json();
                                  if (!res.ok) throw new Error(json.message || 'Erreur');
                                  const r = json.fleeResult;
                                  setAttackResult({ type: 'flee', success: r.success, name: mp.name, roll: r.fleeRoll, mod: r.dexMod, total: r.fleeTotal, dc: r.dc, autoAttacks: json.autoAttacks });
                                  loadAll();
                                } catch (e) {
                                  alert(e.message || 'Erreur');
                                }
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-900 bg-opacity-30 active:bg-amber-800 rounded-xl border border-amber-700 transition min-h-[52px]"
                            >
                              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                              </svg>
                              <span className="text-amber-300 font-semibold text-sm">Fuir</span>
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${API}/combat/${playerCombat.id}/player-end-turn`, {
                                    method: 'POST',
                                    headers: authHeader(),
                                    body: JSON.stringify({ participantId: mp.id }),
                                  });
                                  if (!res.ok) { const json = await res.json(); throw new Error(json.message || 'Erreur'); }
                                  const json = await res.json();
                                  if (json.autoAttacks && json.autoAttacks.length > 0) {
                                    setAttackResult({ type: 'autoAttacks', attacks: json.autoAttacks });
                                  }
                                  loadAll();
                                } catch (e) {
                                  alert(e.message || 'Erreur');
                                }
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 active:bg-gray-600 rounded-xl border border-gray-600 transition min-h-[52px]"
                            >
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-300 font-semibold text-sm">Passer</span>
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ── Attack result display ── */}
            {attackResult && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4">
                  {attackResult.type === 'flee' && (
                    <div className={`rounded-xl p-4 border text-center ${
                      attackResult.success ? 'bg-green-900 bg-opacity-30 border-green-600' : 'bg-red-900 bg-opacity-20 border-red-700'
                    }`}>
                      <p className="text-white font-bold text-sm mb-2">{attackResult.name} tente de fuir !</p>
                      <div className="flex items-center justify-center gap-4">
                        <div>
                          <p className="text-xs text-gray-400">d20 + DEX</p>
                          <p className="text-xl font-bold text-white">{attackResult.roll} + {attackResult.mod} = {attackResult.total}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">DD</p>
                          <p className="text-xl font-bold text-gray-300">{attackResult.dc}</p>
                        </div>
                      </div>
                      <p className={`mt-2 font-bold text-lg ${attackResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {attackResult.success ? 'Fuite reussie !' : 'Fuite echouee !'}
                      </p>
                    </div>
                  )}
                  {attackResult.type === 'initiative' && (
                    <div className="bg-indigo-900 bg-opacity-30 border border-indigo-700 rounded-xl p-4 text-center">
                      <p className="text-indigo-300 text-sm">Initiative</p>
                      <p className="text-white font-bold text-lg">{attackResult.name}</p>
                      <p className="text-2xl font-bold text-yellow-400 mt-1">{attackResult.total}</p>
                      <p className="text-gray-400 text-xs">d20({attackResult.roll}) + DEX({attackResult.mod >= 0 ? '+' : ''}{attackResult.mod})</p>
                    </div>
                  )}
                  {attackResult.type === 'attack' && (
                    <div className={`rounded-xl p-4 border ${
                      attackResult.isCritical ? 'bg-yellow-900 bg-opacity-30 border-yellow-500' :
                      attackResult.isFumble ? 'bg-gray-800 border-gray-600' :
                      attackResult.hits ? 'bg-red-900 bg-opacity-20 border-red-700' : 'bg-gray-800 border-gray-600'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold text-sm">{attackResult.attackerName}</span>
                        <span className="text-gray-400 text-xs">vs</span>
                        <span className="text-white font-bold text-sm">{attackResult.targetName}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400">{attackResult.actionName} <span className="text-cyan-400 font-bold">({attackResult.successRate}%)</span></p>
                        <div className="flex items-center justify-center gap-6 mt-2">
                          <div>
                            <p className="text-xs text-gray-400">d100</p>
                            <p className="text-xl font-bold text-white">
                              <span className={attackResult.isCritical ? 'text-yellow-400' : attackResult.isFumble ? 'text-gray-500' : attackResult.hits ? 'text-green-400' : 'text-red-400'}>{attackResult.attackRoll}</span>
                              <span className="text-sm text-gray-400"> / {attackResult.successRate}</span>
                            </p>
                          </div>
                          {attackResult.hits && (
                            <div>
                              <p className="text-xs text-gray-400">Degats</p>
                              <p className="text-xl font-bold text-red-400">{attackResult.damageTotal}</p>
                            </div>
                          )}
                        </div>
                        <p className={`mt-2 font-bold text-lg ${
                          attackResult.isCritical ? 'text-yellow-400' : attackResult.isFumble ? 'text-gray-500' :
                          attackResult.hits ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {attackResult.isCritical ? 'CRITIQUE !' : attackResult.isFumble ? 'ECHEC CRITIQUE !' : attackResult.hits ? 'TOUCHE !' : 'RATE !'}
                        </p>
                        {attackResult.targetDied && (
                          <p className="text-red-500 font-bold mt-1 animate-pulse">{attackResult.targetName} est mort !</p>
                        )}
                      </div>
                    </div>
                  )}
                  {attackResult.type === 'autoAttacks' && (
                    <div className="space-y-2">
                      <p className="text-emerald-400 font-bold text-sm mb-1">Attaques automatiques ({attackResult.attacks.length})</p>
                      {attackResult.attacks.map((atk, i) => (
                        <div key={i} className={`rounded-lg p-3 border text-sm ${
                          atk.isCritical ? 'bg-yellow-900 bg-opacity-20 border-yellow-800' :
                          atk.hits ? 'bg-red-900 bg-opacity-10 border-red-900' : 'bg-gray-800 border-gray-700'
                        }`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold">{atk.attackerName}</span>
                            <span className="text-gray-500">&rarr;</span>
                            <span className="text-white font-semibold">{atk.targetName}</span>
                            <span className={`text-xs font-bold ${
                              atk.isCritical ? 'text-yellow-400' : atk.hits ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {atk.isCritical ? 'CRIT!' : atk.hits ? 'Touche' : 'Rate'}
                            </span>
                            {atk.hits && <span className="text-red-400 text-xs font-bold">-{atk.damageTotal} PV</span>}
                            {atk.targetDied && <span className="text-red-500 text-xs font-bold">MORT</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setAttackResult(null)}
                  className="w-full min-h-[44px] text-center text-gray-500 hover:text-gray-300 text-xs transition border-t border-gray-700 py-3">
                  Fermer
                </button>
              </div>
            )}

            {/* ── Combat log ── */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Journal de combat</h3>
                <span className="text-xs text-gray-500">{playerLog.length} entree(s)</span>
              </div>
              <div className="max-h-60 overflow-y-auto p-3 space-y-2">
                {playerLog.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">Le combat commence...</p>
                ) : (
                  playerLog.map((entry, i) => (
                    <div key={i} className={`text-sm p-2 rounded-lg ${
                      entry.type === 'flee' ? (entry.success ? 'bg-green-900 bg-opacity-20 border border-green-800' : 'bg-amber-900 bg-opacity-10 border border-amber-900') :
                      entry.isCritical ? 'bg-yellow-900 bg-opacity-20 border border-yellow-800' :
                      entry.hits ? 'bg-red-900 bg-opacity-10 border border-red-900' : 'bg-gray-800 border border-gray-700'
                    }`}>
                      {entry.type === 'flee' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">{entry.attackerName}</span>
                          <span className={`text-xs font-bold ${entry.success ? 'text-green-400' : 'text-amber-400'}`}>
                            {entry.success ? 'Fuite reussie' : 'Fuite echouee'} ({entry.fleeTotal} vs DD{entry.dc})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">{entry.attackerName}</span>
                          <span className="text-gray-500">&rarr;</span>
                          <span className="text-white font-semibold">{entry.targetName}</span>
                          <span className={`text-xs font-bold ${entry.hits ? 'text-red-400' : 'text-blue-400'}`}>
                            {entry.isCritical ? 'CRIT!' : entry.isFumble ? 'FUMBLE!' : entry.hits ? `Touche (${entry.attackRoll}/${entry.successRate}%)` : `Rate (${entry.attackRoll}/${entry.successRate}%)`}
                          </span>
                          {entry.hits && <span className="text-red-400 text-xs font-bold">{entry.damageTotal} degats</span>}
                          {entry.targetDied && <span className="text-red-500 text-xs font-bold">MORT</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Player's character(s) details + inventory ── */}
            {myParticipants.map(mp => {
              const items = participantItems[mp.id] || [];
              const pct = hpPercent(mp.hp, mp.maxHp);
              return (
                <div key={mp.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                      {mp.avatar ? (
                        <img src={toFullUrl(mp.avatar)} alt={mp.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg bg-indigo-900 border-2 border-indigo-700">&#x2694;&#xFE0F;</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-base truncate">{mp.name}</p>
                        <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                          <span>HP {mp.hp}/{mp.maxHp}</span>
                          <span>CA {mp.ac}</span>
                          <span>Init. {mp.initiative}</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                          <div className={`h-2 rounded-full transition-all ${hpColor(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {STAT_KEYS.map(k => (
                        <div key={k} className="bg-gray-700 rounded-lg p-2">
                          <p className="text-purple-400 text-xs font-bold">{STAT_LABELS[k]}</p>
                          <p className="text-white text-sm font-bold">{mp[k]}</p>
                          <p className="text-gray-400 text-xs">{mod(mp[k])}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inventory */}
                  <div className="p-4">
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">Inventaire ({items.length})</p>
                    {items.length === 0 ? (
                      <p className="text-gray-500 text-xs text-center py-3">Aucun objet</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-sm font-semibold truncate">{item.name}</span>
                              {item.isConsumable && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.isActive ? 'bg-cyan-900 text-cyan-300' : 'bg-orange-900 text-orange-400'}`}>
                                  {item.isActive ? `Actif (${item.remainingTurns ?? 0}t)` : 'Conso.'}
                                </span>
                              )}
                            </div>
                            {item.effects && (() => {
                              const effects = typeof item.effects === 'string' ? JSON.parse(item.effects) : item.effects;
                              if (!Array.isArray(effects) || effects.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {effects.map((eff, ei) => (
                                    <span key={ei} className={`text-xs px-1.5 py-0.5 rounded ${eff.value > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                      {STAT_LABELS[eff.stat] || eff.stat} {eff.value > 0 ? '+' : ''}{eff.value}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                            {item.isConsumable && (
                              <div className="mt-2">
                                {item.isActive ? (
                                  <button onClick={() => deactivateItem(item.id, mp.id)}
                                    className="min-h-[44px] w-full text-cyan-400 hover:text-cyan-300 text-sm px-3 py-2 bg-cyan-900 bg-opacity-30 rounded-lg transition font-semibold">
                                    Desactiver
                                  </button>
                                ) : (
                                  <button onClick={() => useItem(item.id, mp.id)}
                                    className="min-h-[44px] w-full text-orange-400 hover:text-orange-300 text-sm px-3 py-2 bg-orange-900 bg-opacity-30 rounded-lg transition font-semibold">
                                    Utiliser
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>
    );
  }

  // ── VUE : aucun combat actif ──
  if (combats.length === 0 && !combat) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">&#x2694;&#xFE0F;</div>
            <h2 className="text-2xl font-bold text-white mb-2">Aucun combat en cours</h2>
            <p className="text-gray-400 mb-6">Lancez un nouveau combat pour commencer !</p>
            {isGameMaster ? (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-md mx-auto">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Nom du combat</label>
                <input type="text" value={combatName} onChange={e => setCombatName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 focus:outline-none focus:border-red-500"
                  placeholder="Ex: Embuscade gobeline" />
                <button onClick={createCombat}
                  className="w-full px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-lg font-bold text-lg transition">
                  Lancer le combat
                </button>
              </div>
            ) : (
              <p className="text-gray-500 italic">En attente du MJ pour lancer un combat...</p>
            )}
            <button onClick={() => { loadFinishedCombats(); setViewMode('history'); }}
              className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-semibold transition">
              Voir l'historique des combats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participants = combat?.participants || [];
  const aliveParticipants = participants.filter(p => p.isAlive);
  const currentParticipant = aliveParticipants[combat?.currentTurn ?? 0] || null;
  const combatLog = (combat?.log || []).slice(-30);

  return (
    <div className="flex h-full bg-gray-900 overflow-hidden">

      {/* ══ LEFT: Selecteur de combats + Tracker initiative ══ */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">

        {/* Tabs des combats actifs */}
        <div className="border-b border-gray-700 flex flex-col">
          <div className="flex items-center gap-2 p-3 overflow-x-auto">
            {combats.map(c => (
              <button key={c.id} onClick={() => { setActiveCombatId(c.id); setAttackResult(null); setSelectedAttacker(null); setSelectedTarget(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                  activeCombatId === c.id
                    ? 'bg-red-700 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}>
                {c.name}
              </button>
            ))}
            {isGameMaster && (
              <button onClick={() => setActiveCombatId(null)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-700 text-green-400 hover:bg-gray-600 whitespace-nowrap transition">
                +
              </button>
            )}
            <button onClick={() => { loadFinishedCombats(); setViewMode('history'); }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-700 text-gray-400 hover:bg-gray-600 whitespace-nowrap transition"
              title="Historique">
              Historique
            </button>
          </div>
        </div>

        {/* Formulaire de creation si aucun combat selectionne */}
        {!combat && isGameMaster && (
          <div className="p-4 space-y-3">
            <h3 className="text-white font-bold text-sm">Nouveau combat</h3>
            <input type="text" value={combatName} onChange={e => setCombatName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
              placeholder="Nom du combat..." />
            <button onClick={createCombat}
              className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition">
              Creer
            </button>
          </div>
        )}

        {/* Tracker d'initiative du combat selectionne */}
        {combat && (
          <>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-bold text-lg truncate">{combat.name}</h2>
                {isGameMaster && (
                  <div className="flex items-center gap-2">
                    <button onClick={toggleAutoMode}
                      className={`px-2 py-1 text-xs rounded transition font-semibold ${
                        combat.autoMode
                          ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                      title="Les monstres attaquent automatiquement quand c'est leur tour">
                      Auto {combat.autoMode ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => endCombat(combat.id)} className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition">
                      Fin
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 text-sm">
                <span className="text-yellow-400 font-bold">Round {combat.round}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-300">Tour {(combat.currentTurn || 0) + 1}/{aliveParticipants.length || 1}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Ordre d'initiative</p>

              {participants.map(p => {
                const pct = hpPercent(p.hp, p.maxHp);
                const isCurrent = currentParticipant?.id === p.id;
                const isMonster = p.type === 'MONSTER';

                return (
                  <div key={p.id}
                    className={`rounded-xl border p-3 transition cursor-pointer ${
                      !p.isAlive ? 'border-gray-700 bg-gray-800 opacity-40'
                        : isCurrent ? 'border-yellow-500 bg-yellow-900 bg-opacity-20 ring-2 ring-yellow-500 ring-opacity-50'
                        : selectedAttacker === p.id ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                        : selectedTarget === p.id ? 'border-red-500 bg-red-900 bg-opacity-20'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                    onClick={() => {
                      if (!p.isAlive) return;
                      if (!selectedAttacker) { setSelectedAttacker(p.id); setSelectedAction(0); }
                      else if (selectedAttacker === p.id) setSelectedAttacker(null);
                      else setSelectedTarget(p.id);
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {p.avatar ? (
                          <img src={toFullUrl(p.avatar)} alt={p.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-500" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${isMonster ? 'bg-red-900 border-red-700' : 'bg-indigo-900 border-indigo-700'}`}>
                            {isMonster ? '\uD83D\uDC32' : '\u2694\uFE0F'}
                          </div>
                        )}
                        {isCurrent && p.isAlive && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-800 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm truncate ${!p.isAlive ? 'line-through text-gray-500' : 'text-white'}`}>{p.name}</p>
                          <span className="text-xs text-yellow-400 font-bold bg-yellow-900 bg-opacity-40 px-1.5 rounded">{p.initiative}</span>
                          {(participantItems[p.id] || []).some(it => it.isConsumable && it.isActive) && (
                            <span className="text-[10px] text-cyan-300 bg-cyan-900 bg-opacity-50 px-1 rounded" title="Effet(s) actif(s)">
                              {(participantItems[p.id] || []).filter(it => it.isConsumable && it.isActive).length} effet(s)
                            </span>
                          )}
                        </div>
                        {p.isAlive ? (
                          <div className="mt-1">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>HP {p.hp}/{p.maxHp}</span>
                              <span>CA {p.ac}</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-1.5 mt-0.5">
                              <div className={`h-1.5 rounded-full transition-all ${hpColor(pct)}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-red-400 mt-0.5">Mort</p>
                        )}
                      </div>
                      {isGameMaster && (
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); removeParticipant(p.id); }}
                            className="text-gray-500 hover:text-red-400 text-sm transition" title="Retirer">x</button>
                          {p.isAlive && (
                            <button onClick={(e) => { e.stopPropagation(); setConditionDropdownOpen(conditionDropdownOpen === p.id ? null : p.id); }}
                              className="text-gray-500 hover:text-yellow-400 text-xs transition" title="Conditions">
                              {(participantConditions[p.id] || []).length > 0 ? '\u2B50' : '\u25CB'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {(participantConditions[p.id] || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(participantConditions[p.id] || []).map(cName => {
                          const cond = CONDITIONS.find(c => c.name === cName);
                          if (!cond) return null;
                          return (
                            <span key={cName}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${cond.color} ${cond.text}`}
                              title={cond.name}>
                              <span>{cond.emoji}</span>
                              <span>{cond.name}</span>
                              {isGameMaster && (
                                <button onClick={(e) => { e.stopPropagation(); toggleCondition(p.id, cName); }}
                                  className="ml-0.5 hover:text-white">&times;</button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {conditionDropdownOpen === p.id && isGameMaster && (
                      <div className="mt-2 bg-gray-900 border border-gray-600 rounded-lg p-2 max-h-48 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-1">
                          {CONDITIONS.map(cond => {
                            const active = (participantConditions[p.id] || []).includes(cond.name);
                            return (
                              <button key={cond.name}
                                onClick={() => toggleCondition(p.id, cond.name)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition ${
                                  active ? `${cond.color} ${cond.text}` : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}>
                                <span>{cond.emoji}</span>
                                <span className="truncate">{cond.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {participants.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <p>Aucun participant.</p>
                  <p className="mt-1">Ajoutez des personnages et monstres via le panneau de droite.</p>
                </div>
              )}
            </div>

            {isGameMaster && aliveParticipants.length >= 2 && (
              <div className="p-3 border-t border-gray-700">
                <button onClick={nextTurn}
                  className="w-full px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg font-bold transition">
                  Tour suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ CENTER: Actions + Resultats + Log ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {!combat && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Selectionnez ou creez un combat</p>
          </div>
        )}

        {combat && isGameMaster && (
          <div className="p-4 border-b border-gray-700 space-y-3">

            {/* Attaque */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-bold mb-3">Attaque</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Attaquant</label>
                  <select value={selectedAttacker || ''}
                    onChange={e => { setSelectedAttacker(e.target.value || null); setSelectedAction(0); }}
                    className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">-- Choisir --</option>
                    {aliveParticipants.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type === 'MONSTER' ? 'Monstre' : 'PJ'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cible</label>
                  <select value={selectedTarget || ''}
                    onChange={e => setSelectedTarget(e.target.value || null)}
                    className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500">
                    <option value="">-- Choisir --</option>
                    {aliveParticipants.filter(p => p.id !== selectedAttacker).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (CA {p.ac})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Action</label>
                  {(() => {
                    if (!selectedAttacker) return <div className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-500 text-sm">--</div>;
                    const attacker = participants.find(p => p.id === selectedAttacker);
                    const actions = attacker?.actions || [];
                    if (actions.length === 0) return <div className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm">Attaque (1d4)</div>;
                    return (
                      <select value={selectedAction} onChange={e => setSelectedAction(parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                        {actions.map((a, i) => (
                          <option key={i} value={i}>{a.name} ({a.successRate ?? 50}%) ({a.damage || '1d4'})</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </div>
              <button onClick={performAttack} disabled={!selectedAttacker || !selectedTarget}
                className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-bold transition">
                Lancer l'attaque
              </button>
            </div>

            {/* Degats / Soins */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <h4 className="text-red-400 font-semibold text-sm mb-2">Degats directs</h4>
                <div className="flex gap-2">
                  <select value={dmTarget || ''} onChange={e => setDmTarget(e.target.value || null)}
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                    <option value="">Cible</option>
                    {aliveParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" min="1" value={damageAmount} onChange={e => setDamageAmount(e.target.value)}
                    className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none" placeholder="Dmg" />
                  <button onClick={applyDamage} disabled={!dmTarget || !damageAmount}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition">-HP</button>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <h4 className="text-green-400 font-semibold text-sm mb-2">Soins</h4>
                <div className="flex gap-2">
                  <select value={dmTarget || ''} onChange={e => setDmTarget(e.target.value || null)}
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none">
                    <option value="">Cible</option>
                    {participants.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hp}/{p.maxHp})</option>)}
                  </select>
                  <input type="number" min="1" value={healAmount} onChange={e => setHealAmount(e.target.value)}
                    className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none" placeholder="Soin" />
                  <button onClick={applyHeal} disabled={!dmTarget || !healAmount}
                    className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition">+HP</button>
                </div>
              </div>
            </div>

            {triggerCssAnimation && (
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <h4 className="text-purple-400 font-semibold text-sm mb-2">Animations rapides</h4>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { effect: 'explosion', icon: '\uD83D\uDCA5', label: 'Explosion' },
                    { effect: 'fireball', icon: '\uD83D\uDD25', label: 'Boule de feu' },
                    { effect: 'lightning', icon: '\u26A1', label: 'Eclair' },
                    { effect: 'heal', icon: '\u2728', label: 'Soin' },
                    { effect: 'shield', icon: '\uD83D\uDEE1\uFE0F', label: 'Bouclier' },
                    { effect: 'critical', icon: '\u2694\uFE0F', label: 'Critique' },
                    { effect: 'poison', icon: '\u2620\uFE0F', label: 'Poison' },
                    { effect: 'freeze', icon: '\u2744\uFE0F', label: 'Gel' },
                    { effect: 'buff', icon: '\uD83D\uDCAA', label: 'Buff' },
                    { effect: 'smoke', icon: '\uD83D\uDCA8', label: 'Fumee' },
                  ].map(a => (
                    <button key={a.effect} onClick={() => playCombatAnim(a.effect)}
                      className="px-2 py-1.5 bg-gray-700 hover:bg-purple-700 text-white rounded-lg text-xs transition"
                      title={a.label}>
                      {a.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resultat d'attaque */}
        {combat && attackResult && (
          <div className="p-4 border-b border-gray-700">
            {attackResult.type === 'initiative' && (
              <div className="bg-indigo-900 bg-opacity-30 border border-indigo-700 rounded-xl p-4 text-center">
                <p className="text-indigo-300 text-sm">Initiative</p>
                <p className="text-white font-bold text-lg">{attackResult.name}</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{attackResult.total}</p>
                <p className="text-gray-400 text-xs">d20({attackResult.roll}) + DEX({attackResult.mod >= 0 ? '+' : ''}{attackResult.mod})</p>
              </div>
            )}
            {attackResult.type === 'attack' && (
              <div className={`rounded-xl p-4 border ${
                attackResult.isCritical ? 'bg-yellow-900 bg-opacity-30 border-yellow-500' :
                attackResult.isFumble ? 'bg-gray-800 border-gray-600' :
                attackResult.hits ? 'bg-red-900 bg-opacity-20 border-red-700' : 'bg-gray-800 border-gray-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold">{attackResult.attackerName}</span>
                  <span className="text-gray-400">vs</span>
                  <span className="text-white font-bold">{attackResult.targetName}</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">{attackResult.actionName} <span className="text-cyan-400 font-bold">({attackResult.successRate}%)</span></p>
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div>
                      <p className="text-xs text-gray-400">Jet de d100</p>
                      <p className="text-xl font-bold text-white">
                        <span className={attackResult.isCritical ? 'text-yellow-400' : attackResult.isFumble ? 'text-gray-500' : attackResult.hits ? 'text-green-400' : 'text-red-400'}>{attackResult.attackRoll}</span>
                        <span className="text-sm text-gray-400"> / {attackResult.successRate}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {attackResult.isCritical ? 'Critique ! (1-5)' : attackResult.isFumble ? 'Fumble ! (96-100)' : attackResult.hits ? `${attackResult.attackRoll} <= ${attackResult.successRate}%` : `${attackResult.attackRoll} > ${attackResult.successRate}%`}
                      </p>
                    </div>
                    {attackResult.hits && (
                      <div>
                        <p className="text-xs text-gray-400">Degats ({attackResult.damageFormula})</p>
                        <p className="text-xl font-bold text-red-400">{attackResult.damageTotal}</p>
                        <p className="text-xs text-gray-500">[{attackResult.damageRolls?.join(', ')}]{attackResult.isCritical ? ' (x2 des)' : ''}</p>
                      </div>
                    )}
                  </div>
                  <p className={`mt-2 font-bold text-lg ${
                    attackResult.isCritical ? 'text-yellow-400' : attackResult.isFumble ? 'text-gray-500' :
                    attackResult.hits ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {attackResult.isCritical ? 'CRITIQUE !' : attackResult.isFumble ? 'ECHEC CRITIQUE !' : attackResult.hits ? 'TOUCHE !' : 'RATE !'}
                  </p>
                  {attackResult.targetDied && (
                    <p className="text-red-500 font-bold mt-1 animate-pulse">{attackResult.targetName} est mort !</p>
                  )}
                </div>
              </div>
            )}
            {attackResult.type === 'autoAttacks' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400 font-bold text-sm">Attaques automatiques des monstres</span>
                  <span className="text-xs text-gray-500">({attackResult.attacks.length})</span>
                </div>
                {attackResult.attacks.map((atk, i) => (
                  <div key={i} className={`rounded-lg p-3 border text-sm ${
                    atk.isCritical ? 'bg-yellow-900 bg-opacity-20 border-yellow-800' :
                    atk.isFumble ? 'bg-gray-800 border-gray-700' :
                    atk.hits ? 'bg-red-900 bg-opacity-10 border-red-900' : 'bg-gray-800 border-gray-700'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{atk.attackerName}</span>
                      <span className="text-gray-500">&rarr;</span>
                      <span className="text-white font-semibold">{atk.targetName}</span>
                      <span className="text-gray-500">|</span>
                      <span className="text-orange-400 text-xs">{atk.actionName}</span>
                      <span className="text-gray-500">|</span>
                      <span className="text-gray-400 text-xs">d100={atk.attackRoll}/{atk.successRate}%</span>
                      <span className="text-gray-500">|</span>
                      <span className={`text-xs font-bold ${
                        atk.isCritical ? 'text-yellow-400' : atk.isFumble ? 'text-gray-500' : atk.hits ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {atk.isCritical ? 'CRIT!' : atk.isFumble ? 'FUMBLE!' : atk.hits ? 'Touche' : 'Rate'}
                      </span>
                      {atk.hits && (<><span className="text-gray-500">|</span><span className="text-red-400 text-xs font-bold">-{atk.damageTotal} PV</span></>)}
                      {atk.targetDied && <span className="text-red-500 text-xs font-bold">MORT</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAttackResult(null)}
              className="mt-2 w-full text-center text-gray-500 hover:text-gray-300 text-xs transition">Fermer</button>
          </div>
        )}

        {/* Journal de combat */}
        {combat && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Journal de combat</h3>
              <span className="text-xs text-gray-500">{combatLog.length} entree(s)</span>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {combatLog.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">Le combat commence...</p>
              ) : (
                combatLog.map((entry, i) => (
                  <div key={i} className={`text-sm p-2 rounded-lg ${
                    entry.isCritical ? 'bg-yellow-900 bg-opacity-20 border border-yellow-800' :
                    entry.hits ? 'bg-red-900 bg-opacity-10 border border-red-900' : 'bg-gray-800 border border-gray-700'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{entry.attackerName}</span>
                      <span className="text-gray-500">&rarr;</span>
                      <span className="text-white font-semibold">{entry.targetName}</span>
                      <span className="text-gray-500">|</span>
                      <span className="text-orange-400 text-xs">{entry.actionName}</span>
                      <span className="text-gray-500">|</span>
                      <span className={`text-xs font-bold ${entry.hits ? 'text-red-400' : 'text-blue-400'}`}>
                        {entry.isCritical ? 'CRIT!' : entry.isFumble ? 'FUMBLE!' : entry.hits ? `Touche (${entry.attackRoll}/${entry.successRate}%)` : `Rate (${entry.attackRoll}/${entry.successRate}%)`}
                      </span>
                      {entry.hits && (<><span className="text-gray-500">|</span><span className="text-red-400 text-xs font-bold">{entry.damageTotal} degats</span></>)}
                      {entry.targetDied && <span className="text-red-500 text-xs font-bold">MORT</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ RIGHT: Ajout de participants (MJ) ══ */}
      {combat && isGameMaster && (
        <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-bold text-sm">Ajouter au combat</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Personnages</p>
              {characters.length === 0 ? (
                <p className="text-gray-500 text-xs">Aucun personnage dans cette partie.</p>
              ) : (
                <div className="space-y-1">
                  {characters.map(c => {
                    const alreadyIn = participants.some(p => p.characterId === c.id);
                    return (
                      <button key={c.id} onClick={() => addCharacter(c.id)} disabled={alreadyIn}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          alreadyIn ? 'bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed' : 'bg-gray-700 hover:bg-indigo-700 text-white cursor-pointer'
                        }`}>
                        <span className="font-semibold">{c.name}</span>
                        {alreadyIn && <span className="ml-2 text-xs text-gray-500">(deja en combat)</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Monstres</p>
              {monsters.length === 0 ? (
                <p className="text-gray-500 text-xs">Aucun monstre dans cette partie.</p>
              ) : (
                <div className="space-y-1">
                  {monsters.map(m => (
                    <button key={m.id} onClick={() => addMonster(m.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm bg-gray-700 hover:bg-red-700 text-white cursor-pointer transition">
                      <span className="font-semibold">{m.name}</span>
                      {participants.some(p => p.monsterId === m.id) && <span className="ml-2 text-xs text-yellow-400">(+1)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedAttacker && (() => {
              const p = participants.find(x => x.id === selectedAttacker);
              if (!p) return null;
              return (
                <div className="bg-gray-700 rounded-xl p-3 border border-gray-600">
                  <p className="text-white font-bold text-sm mb-2">{p.name}</p>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {STAT_KEYS.map(k => (
                      <div key={k} className="bg-gray-800 rounded p-1">
                        <p className="text-purple-400 text-xs font-bold">{STAT_LABELS[k]}</p>
                        <p className="text-white text-sm font-bold">{p[k]}</p>
                        <p className="text-gray-400 text-xs">{mod(p[k])}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-center text-xs">
                    <div className="bg-gray-800 rounded p-1">
                      <p className="text-blue-400">CA</p>
                      <p className="text-white font-bold">{p.ac}</p>
                    </div>
                    <div className="bg-gray-800 rounded p-1">
                      <p className="text-green-400">Vitesse</p>
                      <p className="text-white font-bold">{p.speed} ft</p>
                    </div>
                  </div>
                  {p.actions?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-orange-400 text-xs font-bold mb-1">Actions</p>
                      {p.actions.map((a, i) => (
                        <div key={i} className="text-xs text-gray-300 flex gap-1">
                          <span className="text-white font-semibold">{a.name}</span>
                          <span className="text-cyan-400 font-bold">{a.successRate ?? 50}%</span>
                          {a.damage && <span className="text-orange-400">({a.damage})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {(participantItems[p.id] || []).length > 0 && (
                    <div className="mt-3 border-t border-gray-600 pt-2">
                      <p className="text-amber-400 text-xs font-bold mb-1">Inventaire</p>
                      <div className="space-y-1.5">
                        {(participantItems[p.id] || []).map(item => (
                          <div key={item.id} className="bg-gray-800 rounded-lg p-2 border border-gray-600">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-xs font-semibold truncate">{item.name}</span>
                              <div className="flex items-center gap-1">
                                {item.isConsumable && (
                                  <span className={`text-[10px] px-1 rounded ${item.isActive ? 'bg-cyan-900 text-cyan-300' : 'bg-orange-900 text-orange-400'}`}>
                                    {item.isActive ? `Actif (${item.remainingTurns ?? 0}t)` : 'Conso.'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.effects && (() => {
                              const effects = typeof item.effects === 'string' ? JSON.parse(item.effects) : item.effects;
                              if (!Array.isArray(effects) || effects.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {effects.map((eff, ei) => (
                                    <span key={ei} className={`text-[10px] px-1 rounded ${eff.value > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                      {STAT_LABELS[eff.stat] || eff.stat} {eff.value > 0 ? '+' : ''}{eff.value}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                            {item.isConsumable && (
                              <div className="mt-1">
                                {item.isActive ? (
                                  <button onClick={() => deactivateItem(item.id, p.id)}
                                    className="text-cyan-400 hover:text-cyan-300 text-[10px] px-2 py-0.5 bg-cyan-900 bg-opacity-30 rounded transition">
                                    Desactiver
                                  </button>
                                ) : (
                                  <button onClick={() => useItem(item.id, p.id)}
                                    className="text-orange-400 hover:text-orange-300 text-[10px] px-2 py-0.5 bg-orange-900 bg-opacity-30 rounded transition">
                                    Utiliser
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {combat && !isGameMaster && (
        <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-bold text-sm">Inventaire</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {selectedAttacker && (() => {
              const p = participants.find(x => x.id === selectedAttacker);
              if (!p) return null;
              const items = participantItems[p.id] || [];
              return (
                <div>
                  <p className="text-white font-bold text-sm mb-2">{p.name}</p>
                  <div className="grid grid-cols-3 gap-1 text-center mb-3">
                    {STAT_KEYS.map(k => (
                      <div key={k} className="bg-gray-700 rounded p-1">
                        <p className="text-purple-400 text-xs font-bold">{STAT_LABELS[k]}</p>
                        <p className="text-white text-sm font-bold">{p[k]}</p>
                        <p className="text-gray-400 text-xs">{mod(p[k])}</p>
                      </div>
                    ))}
                  </div>
                  {items.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-4">Aucun objet</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-amber-400 text-xs font-bold mb-1">Objets ({items.length})</p>
                      {items.map(item => (
                        <div key={item.id} className="bg-gray-700 rounded-lg p-2 border border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-xs font-semibold truncate">{item.name}</span>
                            <div className="flex items-center gap-1">
                              {item.isConsumable && (
                                <span className={`text-[10px] px-1 rounded ${item.isActive ? 'bg-cyan-900 text-cyan-300' : 'bg-orange-900 text-orange-400'}`}>
                                  {item.isActive ? `Actif (${item.remainingTurns ?? 0}t)` : 'Conso.'}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.effects && (() => {
                            const effects = typeof item.effects === 'string' ? JSON.parse(item.effects) : item.effects;
                            if (!Array.isArray(effects) || effects.length === 0) return null;
                            return (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {effects.map((eff, ei) => (
                                  <span key={ei} className={`text-[10px] px-1 rounded ${eff.value > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                    {STAT_LABELS[eff.stat] || eff.stat} {eff.value > 0 ? '+' : ''}{eff.value}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          {item.isConsumable && (
                            <div className="mt-1">
                              {item.isActive ? (
                                <button onClick={() => deactivateItem(item.id, p.id)}
                                  className="text-cyan-400 hover:text-cyan-300 text-[10px] px-2 py-0.5 bg-cyan-900 bg-opacity-30 rounded transition">
                                  Desactiver
                                </button>
                              ) : (
                                <button onClick={() => useItem(item.id, p.id)}
                                  className="text-orange-400 hover:text-orange-300 text-[10px] px-2 py-0.5 bg-orange-900 bg-opacity-30 rounded transition">
                                  Utiliser
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {!selectedAttacker && (
              <p className="text-gray-500 text-xs text-center py-8">Cliquez sur un participant pour voir son inventaire</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
