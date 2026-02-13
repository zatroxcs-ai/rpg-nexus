import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API = '${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api';
const authHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const toFullUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:3000${url}`;
};

const hpColor = (pct) => pct <= 25 ? 'text-red-400' : pct <= 50 ? 'text-orange-400' : pct <= 75 ? 'text-yellow-400' : 'text-green-400';
const barColor = (pct) => pct <= 25 ? 'bg-red-500' : pct <= 50 ? 'bg-orange-500' : pct <= 75 ? 'bg-yellow-500' : 'bg-green-500';

function computeCombatStats(combats, username) {
  const stats = {
    totalCombats: combats.length,
    totalAttacks: 0,
    totalHits: 0,
    totalMisses: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalCriticals: 0,
    totalFumbles: 0,
    maxDamageOneHit: 0,
    favoriteAction: null,
    combatWins: 0,
    totalRounds: 0,
    actionCounts: {},
  };

  if (!combats || combats.length === 0) return stats;

  combats.forEach(combat => {
    const log = Array.isArray(combat.log) ? combat.log : [];
    stats.totalRounds += combat.round || 0;

    const myParticipants = (combat.participants || []).filter(p =>
      p.name?.toLowerCase() === username?.toLowerCase()
    );
    const myNames = myParticipants.map(p => p.name);
    const myDied = myParticipants.some(p => !p.isAlive);
    if (myDied) stats.totalDeaths++;

    const enemies = (combat.participants || []).filter(p => !myNames.includes(p.name));
    const allEnemiesDead = enemies.length > 0 && enemies.every(p => !p.isAlive);
    if (allEnemiesDead && myParticipants.some(p => p.isAlive)) stats.combatWins++;

    log.forEach(entry => {
      if (myNames.includes(entry.attackerName)) {
        stats.totalAttacks++;
        if (entry.hits) {
          stats.totalHits++;
          stats.totalDamageDealt += entry.damageTotal || 0;
          if ((entry.damageTotal || 0) > stats.maxDamageOneHit) {
            stats.maxDamageOneHit = entry.damageTotal;
          }
        } else {
          stats.totalMisses++;
        }
        if (entry.isCritical) stats.totalCriticals++;
        if (entry.isFumble) stats.totalFumbles++;
        if (entry.targetDied) stats.totalKills++;

        const actionName = entry.actionName || 'Attaque';
        stats.actionCounts[actionName] = (stats.actionCounts[actionName] || 0) + 1;
      }

      if (myNames.includes(entry.targetName) && entry.hits) {
        stats.totalDamageTaken += entry.damageTotal || 0;
      }
    });
  });

  if (Object.keys(stats.actionCounts).length > 0) {
    stats.favoriteAction = Object.entries(stats.actionCounts)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  return stats;
}

export default function PlayerStats() {
  const { gameId } = useParams();
  const [activeTab, setActiveTab] = useState('dice');
  const [diceStats, setDiceStats] = useState(null);
  const [diceLoading, setDiceLoading] = useState(true);
  const [diceError, setDiceError] = useState(null);
  const [combats, setCombats] = useState([]);
  const [combatLoading, setCombatLoading] = useState(true);
  const [combatError, setCombatError] = useState(null);
  const [selectedCombat, setSelectedCombat] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.username || payload.name || '');
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadDiceStats();
    loadCombats();
  }, [gameId]);

  const loadDiceStats = async () => {
    setDiceLoading(true);
    setDiceError(null);
    try {
      const res = await fetch(`${API}/dice/stats/player/${gameId}`, { headers: authHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDiceStats(data);
    } catch (err) {
      console.error('Erreur stats des:', err);
      setDiceError(err.message);
    } finally {
      setDiceLoading(false);
    }
  };

  const loadCombats = async () => {
    setCombatLoading(true);
    setCombatError(null);
    try {
      const [activeRes, finishedRes] = await Promise.all([
        fetch(`${API}/combat/game/${gameId}/active`, { headers: authHeader() }),
        fetch(`${API}/combat/game/${gameId}/finished`, { headers: authHeader() }),
      ]);
      const active = activeRes.ok ? await activeRes.json() : [];
      const finished = finishedRes.ok ? await finishedRes.json() : [];
      const all = [...(Array.isArray(finished) ? finished : []), ...(Array.isArray(active) ? active : [])];
      setCombats(all);
    } catch (err) {
      console.error('Erreur chargement combats:', err);
      setCombatError(err.message);
    } finally {
      setCombatLoading(false);
    }
  };

  const combatStats = computeCombatStats(combats, username);
  const hitRate = combatStats.totalAttacks > 0
    ? Math.round((combatStats.totalHits / combatStats.totalAttacks) * 100) : 0;

  const tabs = [
    { id: 'dice', label: 'Des', icon: '\uD83C\uDFB2' },
    { id: 'combat', label: 'Combat', icon: '\u2694\uFE0F' },
    { id: 'history', label: 'Historique', icon: '\uD83D\uDCDC' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-3">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dice' && renderDiceTab()}
        {activeTab === 'combat' && renderCombatTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>
    </div>
  );

  function renderDiceTab() {
    if (diceLoading) return <div className="text-center py-8 text-gray-400">Chargement des statistiques...</div>;
    if (diceError) return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-2">Erreur : {diceError}</p>
        <button onClick={loadDiceStats} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">Reessayer</button>
      </div>
    );
    if (!diceStats || diceStats.totalRolls === 0) return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-5xl mb-3">{'\uD83C\uDFB2'}</div>
        <p className="text-lg">Aucun jet de des enregistre.</p>
        <p className="text-sm mt-1 text-gray-500">Lancez vos premiers des pour voir vos statistiques !</p>
      </div>
    );

    const dist = diceStats.distribution || {};
    const recentRolls = diceStats.recentRolls || [];

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard value={diceStats.totalRolls} label="Jets lances" color="text-indigo-400" />
          <StatCard value={diceStats.average} label="Moyenne" color="text-green-400" />
          <StatCard value={diceStats.highest} label="Plus haut" color="text-blue-400" />
          <StatCard value={diceStats.lowest} label="Plus bas" color="text-purple-400" />
        </div>

        {(diceStats.criticalSuccesses > 0 || diceStats.criticalFailures > 0) && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 text-white">Critiques (d20)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{diceStats.criticalSuccesses}</div>
                <div className="text-sm text-gray-400">Reussites critiques (20)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{diceStats.criticalFailures}</div>
                <div className="text-sm text-gray-400">Echecs critiques (1)</div>
              </div>
            </div>
          </div>
        )}

        {Object.keys(dist).length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 text-white">Distribution par type de de</h3>
            <div className="space-y-2">
              {Object.entries(dist)
                .sort(([a], [b]) => parseInt(a.replace('d', '')) - parseInt(b.replace('d', '')))
                .map(([diceType, count]) => (
                  <div key={diceType} className="flex items-center gap-3">
                    <div className="w-12 text-sm font-semibold text-gray-300">{diceType}</div>
                    <div className="flex-1 bg-gray-700 rounded-full h-5 relative overflow-hidden">
                      <div className="bg-indigo-600 h-5 rounded-full flex items-center justify-end px-2 transition-all"
                        style={{ width: `${Math.max(10, (count / diceStats.totalRolls) * 100)}%` }}>
                        <span className="text-xs font-semibold text-white">{count}</span>
                      </div>
                    </div>
                    <div className="w-12 text-sm text-gray-400 text-right">
                      {Math.round((count / diceStats.totalRolls) * 100)}%
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {recentRolls.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 text-white">Jets recents</h3>
            <div className="space-y-1.5">
              {recentRolls.map((roll, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
                  <div>
                    <span className="font-semibold text-indigo-300 text-sm">{roll.formula}</span>
                    {roll.reason && <span className="text-xs text-gray-400 ml-2">({roll.reason})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{Array.isArray(roll.results) ? roll.results.join(', ') : ''}</span>
                    <span className="text-lg font-bold text-white min-w-[2.5rem] text-right">{roll.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderCombatTab() {
    if (combatLoading) return <div className="text-center py-8 text-gray-400">Chargement...</div>;
    if (combatError) return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-2">Erreur : {combatError}</p>
        <button onClick={loadCombats} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">Reessayer</button>
      </div>
    );
    if (combats.length === 0) return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-5xl mb-3">{'\u2694\uFE0F'}</div>
        <p className="text-lg">Aucun combat effectue.</p>
        <p className="text-sm mt-1 text-gray-500">Participez a un combat pour voir vos statistiques !</p>
      </div>
    );

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard value={combatStats.totalCombats} label="Combats" color="text-red-400" />
          <StatCard value={combatStats.combatWins} label="Victoires" color="text-green-400" />
          <StatCard value={combatStats.totalKills} label="Eliminations" color="text-orange-400" />
          <StatCard value={combatStats.totalDeaths} label="Morts" color="text-gray-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard value={combatStats.totalAttacks} label="Attaques lancees" color="text-blue-400" />
          <StatCard value={`${hitRate}%`} label="Taux de touche" color="text-cyan-400" />
          <StatCard value={combatStats.totalDamageDealt} label="Degats infliges" color="text-red-400" />
          <StatCard value={combatStats.totalDamageTaken} label="Degats subis" color="text-orange-400" />
          <StatCard value={combatStats.totalCriticals} label="Coups critiques" color="text-yellow-400" />
          <StatCard value={combatStats.maxDamageOneHit} label="Max degats (1 coup)" color="text-pink-400" />
        </div>

        {combatStats.totalAttacks > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 text-white">Performance en combat</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Taux de touche</span>
                  <span className="text-white font-bold">{hitRate}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className={`h-3 rounded-full transition-all ${hitRate >= 60 ? 'bg-green-500' : hitRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${hitRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Ratio critique</span>
                  <span className="text-white font-bold">
                    {combatStats.totalAttacks > 0 ? Math.round((combatStats.totalCriticals / combatStats.totalAttacks) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-yellow-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(100, combatStats.totalAttacks > 0 ? (combatStats.totalCriticals / combatStats.totalAttacks) * 100 : 0)}%` }} />
                </div>
              </div>
              {combatStats.totalDamageDealt > 0 && combatStats.totalHits > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Degats moyens par touche</span>
                  <span className="text-red-400 font-bold">{Math.round(combatStats.totalDamageDealt / combatStats.totalHits)}</span>
                </div>
              )}
              {combatStats.favoriteAction && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Action favorite</span>
                  <span className="text-purple-400 font-bold">{combatStats.favoriteAction}</span>
                </div>
              )}
              {combatStats.totalRounds > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Rounds totaux</span>
                  <span className="text-amber-400 font-bold">{combatStats.totalRounds}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {Object.keys(combatStats.actionCounts).length > 1 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 text-white">Actions utilisees</h3>
            <div className="space-y-2">
              {Object.entries(combatStats.actionCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([action, count]) => (
                  <div key={action} className="flex items-center gap-3">
                    <div className="flex-1 text-sm text-gray-300">{action}</div>
                    <div className="w-32 bg-gray-700 rounded-full h-4 relative overflow-hidden">
                      <div className="bg-purple-600 h-4 rounded-full transition-all"
                        style={{ width: `${(count / combatStats.totalAttacks) * 100}%` }} />
                    </div>
                    <div className="w-8 text-sm text-gray-400 text-right">{count}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderHistoryTab() {
    if (combatLoading) return <div className="text-center py-8 text-gray-400">Chargement...</div>;
    if (combatError) return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-2">Erreur : {combatError}</p>
        <button onClick={loadCombats} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">Reessayer</button>
      </div>
    );
    if (combats.length === 0) return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-5xl mb-3">{'\uD83D\uDCDC'}</div>
        <p className="text-lg">Aucun combat dans l'historique.</p>
      </div>
    );

    if (selectedCombat) {
      const log = Array.isArray(selectedCombat.log) ? selectedCombat.log : [];
      const participants = selectedCombat.participants || [];
      const totalDmg = log.filter(e => e.hits).reduce((s, e) => s + (e.damageTotal || 0), 0);
      const deaths = log.filter(e => e.targetDied).length;
      const crits = log.filter(e => e.isCritical).length;

      return (
        <div className="space-y-4">
          <button onClick={() => setSelectedCombat(null)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition">
            Retour a la liste
          </button>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-lg">{selectedCombat.name}</h3>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                selectedCombat.status === 'FINISHED' ? 'bg-gray-600 text-gray-300' : 'bg-green-700 text-green-200'
              }`}>
                {selectedCombat.status === 'FINISHED' ? 'Termine' : 'En cours'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-xl font-bold text-yellow-400">{selectedCombat.round || 0}</div>
                <div className="text-xs text-gray-400">Rounds</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-400">{totalDmg}</div>
                <div className="text-xs text-gray-400">Degats totaux</div>
              </div>
              <div>
                <div className="text-xl font-bold text-orange-400">{deaths}</div>
                <div className="text-xs text-gray-400">Eliminations</div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-400">{crits}</div>
                <div className="text-xs text-gray-400">Critiques</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="font-semibold text-white mb-3">Participants</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participants.map(p => {
                const pct = p.maxHp > 0 ? Math.round((p.hp / p.maxHp) * 100) : 0;
                return (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg border ${
                    p.isAlive ? 'bg-gray-700 border-gray-600' : 'bg-gray-800 border-gray-700 opacity-50'
                  }`}>
                    {p.avatar ? (
                      <img src={toFullUrl(p.avatar)} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        p.type === 'MONSTER' ? 'bg-red-900' : 'bg-indigo-900'
                      }`}>
                        {p.type === 'MONSTER' ? '\uD83D\uDC32' : '\u2694\uFE0F'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${p.isAlive ? 'text-white' : 'text-gray-500 line-through'}`}>{p.name}</span>
                        <span className="text-xs text-yellow-400">{p.initiative}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${hpColor(pct)}`}>{p.hp}/{p.maxHp} HP</span>
                        <span className="text-xs text-blue-400">CA {p.ac}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {log.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h4 className="font-semibold text-white mb-3">Journal ({log.length} actions)</h4>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {log.map((entry, i) => (
                  <div key={i} className={`text-sm p-2 rounded-lg ${
                    entry.isCritical ? 'bg-yellow-900 bg-opacity-20 border border-yellow-800' :
                    entry.isFumble ? 'bg-gray-800 border border-gray-700' :
                    entry.hits ? 'bg-red-900 bg-opacity-10 border border-red-900' : 'bg-gray-700 border border-gray-600'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">R{entry.round}</span>
                      <span className="text-white font-semibold text-xs">{entry.attackerName}</span>
                      <span className="text-gray-500 text-xs">{'\u2192'}</span>
                      <span className="text-white font-semibold text-xs">{entry.targetName}</span>
                      <span className="text-orange-400 text-xs">{entry.actionName}</span>
                      <span className={`text-xs font-bold ${
                        entry.isCritical ? 'text-yellow-400' : entry.isFumble ? 'text-gray-500' : entry.hits ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {entry.isCritical ? 'CRIT!' : entry.isFumble ? 'FUMBLE!' : entry.hits ? 'Touche' : 'Rate'}
                      </span>
                      {entry.hits && <span className="text-red-400 text-xs">-{entry.damageTotal}</span>}
                      {entry.targetDied && <span className="text-red-500 text-xs font-bold">MORT</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {combats.map(c => {
          const log = Array.isArray(c.log) ? c.log : [];
          const totalDmg = log.filter(e => e.hits).reduce((s, e) => s + (e.damageTotal || 0), 0);
          const deaths = log.filter(e => e.targetDied).length;
          return (
            <button key={c.id} onClick={() => setSelectedCombat(c)}
              className="w-full text-left p-4 rounded-xl border border-gray-700 bg-gray-800 hover:border-gray-500 transition">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-bold">{c.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  c.status === 'FINISHED' ? 'bg-gray-600 text-gray-300' : 'bg-green-700 text-green-200'
                }`}>
                  {c.status === 'FINISHED' ? 'Termine' : 'En cours'}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span className="text-yellow-400">{c.round || 0} rounds</span>
                <span>{(c.participants || []).length} participants</span>
                <span className="text-red-400">{totalDmg} degats</span>
                {deaths > 0 && <span className="text-red-500">{deaths} mort(s)</span>}
                <span>{log.length} actions</span>
              </div>
              {c.createdAt && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }
}

function StatCard({ value, label, color }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
