// frontend/src/components/CharacterCard.jsx

const DND_STATS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
const PRESET_KEYS = ['HP', 'HP Max', 'CA', 'FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA', 'Vitesse', '_actions', '_modelId'];

const modifier = (val) => {
  if (!val) return '+0';
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

export default function CharacterCard({ character, onEdit, onDelete, canEdit }) {
  const data = character.data || {};

  const hasHP        = 'HP' in data && 'HP Max' in data;
  const hasCA        = 'CA' in data;
  const hasSpeed     = 'Vitesse' in data;
  const hasDndStats  = DND_STATS.some(s => s in data);
  const hasActions   = Array.isArray(data._actions) && data._actions.length > 0;

  const hpPct = hasHP ? Math.max(0, Math.min(100, (data['HP'] / data['HP Max']) * 100)) : 0;
  const hpColor = hpPct <= 25 ? 'bg-red-500' : hpPct <= 50 ? 'bg-orange-500' : hpPct <= 75 ? 'bg-yellow-500' : 'bg-green-500';

  // Stats et champs NON-préréglages
  const customStats  = Object.entries(data).filter(([k, v]) => !PRESET_KEYS.includes(k) && typeof v === 'number');
  const customFields = Object.entries(data).filter(([k, v]) => !PRESET_KEYS.includes(k) && typeof v === 'string' && v);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-500 transition overflow-hidden">

      {/* ── HEADER ── */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-14 h-14 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden border-2 border-gray-600">
          {character.avatarUrl || character.avatar ? (
            <img src={character.avatarUrl || character.avatar} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{character.name}</h3>
          {character.owner ? (
            <p className="text-sm text-gray-400">@{character.owner.username}</p>
          ) : (
            <span className="inline-block px-2 py-0.5 bg-purple-700 text-white text-xs rounded-full">PNJ</span>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(character)} className="p-1.5 hover:bg-gray-700 rounded-lg transition text-indigo-400 hover:text-indigo-300" title="Modifier">✏️</button>
            <button onClick={() => onDelete(character.id)} className="p-1.5 hover:bg-gray-700 rounded-lg transition text-red-400 hover:text-red-300" title="Supprimer">🗑️</button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">

        {/* ── HP ── */}
        {hasHP && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>❤️ HP</span>
              <span className="font-bold text-white">{data['HP']} / {data['HP Max']}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${hpColor}`} style={{ width: `${hpPct}%` }} />
            </div>
          </div>
        )}

        {/* ── CA + VITESSE ── */}
        {(hasCA || hasSpeed) && (
          <div className={`grid gap-2 ${hasCA && hasSpeed ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {hasCA && (
              <div className="bg-gray-700 rounded-lg p-2 text-center border border-blue-900">
                <p className="text-xs text-blue-400">🛡️ CA</p>
                <p className="text-xl font-bold text-white">{data['CA']}</p>
              </div>
            )}
            {hasSpeed && (
              <div className="bg-gray-700 rounded-lg p-2 text-center border border-green-900">
                <p className="text-xs text-green-400">💨 Vitesse</p>
                <p className="text-xl font-bold text-white">{data['Vitesse']}<span className="text-sm text-gray-400"> ft</span></p>
              </div>
            )}
          </div>
        )}

        {/* ── STATS D&D ── */}
        {hasDndStats && (
          <div className="bg-gray-700 rounded-lg p-2 border border-purple-900">
            <p className="text-xs text-purple-400 mb-2">🎲 Caractéristiques</p>
            <div className="grid grid-cols-6 gap-1">
              {DND_STATS.map(stat => (
                stat in data && (
                  <div key={stat} className="text-center bg-gray-800 rounded p-1">
                    <p className="text-xs font-bold text-purple-300">{stat}</p>
                    <p className="text-sm font-bold text-white">{data[stat]}</p>
                    <p className="text-xs text-gray-400">{modifier(data[stat])}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* ── STATS PERSONNALISÉES ── */}
        {customStats.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {customStats.map(([key, value]) => (
              <div key={key} className="bg-gray-700 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-400 font-medium">{key}</div>
                <div className="text-lg font-bold text-white">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── ACTIONS ── */}
        {hasActions && (
          <div className="bg-gray-700 rounded-lg p-2 border border-orange-900">
            <p className="text-xs text-orange-400 mb-2">⚔️ Actions</p>
            <div className="space-y-1">
              {data._actions.map((action, i) => (
                <div key={i} className="border-l-2 border-orange-600 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-semibold">{action.name}</span>
                    {action.damage && <span className="text-xs text-orange-400 bg-orange-900 bg-opacity-40 px-1 rounded">{action.damage}</span>}
                  </div>
                  {action.description && <p className="text-gray-400 text-xs">{action.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHAMPS TEXTE ── */}
        {customFields.length > 0 && (
          <div className="space-y-1">
            {customFields.map(([key, value]) => (
              <div key={key} className="text-sm flex gap-1">
                <span className="text-gray-400 shrink-0">{key} :</span>
                <span className="text-white">{value}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
