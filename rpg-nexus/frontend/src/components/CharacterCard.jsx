const DND_STATS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
const PRESET_KEYS = ['HP', 'HP Max', 'CA', 'FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA', 'Vitesse', '_actions', '_modelId', '_inventory', '_xp', '_level'];

const getItemBonuses = (items) => {
  const bonuses = {};
  if (!Array.isArray(items)) return bonuses;
  for (const item of items) {
    if (!Array.isArray(item.effects)) continue;
    if (item.isConsumable && !item.isActive) continue;
    for (const effect of item.effects) {
      bonuses[effect.stat] = (bonuses[effect.stat] || 0) + (effect.modifier || 0);
    }
  }
  return bonuses;
};

const modifier = (val) => {
  if (!val) return '+0';
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

const toFullUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:3000${url}`;
};

export default function CharacterCard({ character, items = [], onEdit, onDelete, canEdit, deleteConfirmId, onDeleteConfirm, onDeleteCancel }) {
  const data = character.data || {};
  const bonuses = getItemBonuses(items);

  const hasHP = 'HP' in data && 'HP Max' in data;
  const hasCA = 'CA' in data;
  const hasSpeed = 'Vitesse' in data;
  const hasDndStats = DND_STATS.some(s => s in data);
  const hasActions = Array.isArray(data._actions) && data._actions.length > 0;
  const hasXP = '_level' in data || '_xp' in data;

  const effHP = hasHP ? data['HP'] + (bonuses['HP'] || 0) : 0;
  const effHPMax = hasHP ? data['HP Max'] + (bonuses['HP Max'] || 0) : 0;
  const hpPct = hasHP ? Math.max(0, Math.min(100, (effHP / effHPMax) * 100)) : 0;
  const hpColor = hpPct <= 25 ? 'bg-red-500' : hpPct <= 50 ? 'bg-orange-500' : hpPct <= 75 ? 'bg-yellow-500' : 'bg-green-500';

  const customStats = Object.entries(data).filter(([k, v]) => !PRESET_KEYS.includes(k) && typeof v === 'number');
  const customFields = Object.entries(data).filter(([k, v]) => !PRESET_KEYS.includes(k) && typeof v === 'string' && v);

  const avatarUrl = toFullUrl(character.avatarUrl || character.avatar);
  const isDeleting = deleteConfirmId === character.id;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 transition overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={character.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-gray-400 text-lg font-bold shrink-0">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{character.name}</h3>
            {character.owner ? (
              <p className="text-xs text-gray-400">@{character.owner.username}</p>
            ) : (
              <span className="px-2 py-0.5 bg-purple-900 text-purple-300 text-xs rounded-full">PNJ</span>
            )}
          </div>
        </div>

        {hasXP && (
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-indigo-900 bg-opacity-40 border border-indigo-800 rounded-lg px-2 py-0.5 flex items-center gap-1">
              <span className="text-indigo-400 text-[10px] font-bold">Niv.</span>
              <span className="text-white font-bold text-sm">{data['_level'] ?? 1}</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-indigo-400">XP</span>
                <span className="text-white font-bold">{data['_xp'] ?? 0}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1 mt-0.5">
                <div className="h-1 rounded-full bg-indigo-500 transition-all" style={{
                  width: `${Math.min(100, ((data['_xp'] ?? 0) / ([0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000][(data['_level'] ?? 1) - 1] || 355000)) * 100)}%`
                }} />
              </div>
            </div>
          </div>
        )}

        {hasHP && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>PV</span>
              <span className="font-bold text-white">
                {effHP} / {effHPMax}
                {(bonuses['HP'] || bonuses['HP Max']) ? (
                  <span className="text-cyan-400 ml-1 text-[10px]">
                    ({bonuses['HP'] ? `${bonuses['HP'] > 0 ? '+' : ''}${bonuses['HP']}` : ''}{bonuses['HP'] && bonuses['HP Max'] ? '/' : ''}{bonuses['HP Max'] ? `${bonuses['HP Max'] > 0 ? '+' : ''}${bonuses['HP Max']}` : ''})
                  </span>
                ) : null}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${hpColor}`} style={{ width: `${hpPct}%` }} />
            </div>
          </div>
        )}

        {(hasCA || hasSpeed) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {hasCA && (
              <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-xs rounded font-semibold">
                CA {data['CA'] + (bonuses['CA'] || 0)}
                {bonuses['CA'] ? <span className={`ml-1 text-[10px] ${bonuses['CA'] > 0 ? 'text-green-400' : 'text-red-400'}`}>({bonuses['CA'] > 0 ? '+' : ''}{bonuses['CA']})</span> : null}
              </span>
            )}
            {hasSpeed && (
              <span className="px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded font-semibold">
                {data['Vitesse'] + (bonuses['Vitesse'] || 0)} ft
                {bonuses['Vitesse'] ? <span className={`ml-1 text-[10px] ${bonuses['Vitesse'] > 0 ? 'text-green-300' : 'text-red-400'}`}>({bonuses['Vitesse'] > 0 ? '+' : ''}{bonuses['Vitesse']})</span> : null}
              </span>
            )}
          </div>
        )}

        {hasDndStats && (
          <div className="grid grid-cols-6 gap-1 mb-3">
            {DND_STATS.map(stat => {
              if (!(stat in data)) return null;
              const bonus = bonuses[stat] || 0;
              const effective = data[stat] + bonus;
              return (
                <div key={stat} className={`text-center rounded p-1 ${bonus !== 0 ? (bonus > 0 ? 'bg-green-900 bg-opacity-40' : 'bg-red-900 bg-opacity-40') : 'bg-gray-700'}`}>
                  <p className="text-gray-400 text-[10px] font-bold">{stat}</p>
                  <p className="text-white text-xs font-semibold">{effective}</p>
                  <p className="text-gray-500 text-[10px]">{modifier(effective)}</p>
                  {bonus !== 0 && (
                    <p className={`text-[9px] ${bonus > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {bonus > 0 ? '+' : ''}{bonus}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {customStats.length > 0 && (
          <div className="grid grid-cols-3 gap-1 mb-3">
            {customStats.map(([key, value]) => (
              <div key={key} className="bg-gray-700 rounded p-1 text-center">
                <p className="text-gray-400 text-[10px]">{key}</p>
                <p className="text-white text-xs font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {hasActions && (
          <div className="mb-3">
            <p className="text-gray-400 text-xs font-semibold mb-1">Actions</p>
            <div className="space-y-1">
              {data._actions.slice(0, 3).map((action, i) => (
                <div key={i} className="flex items-center gap-1 border-l-2 border-orange-600 pl-2">
                  <span className="text-white text-xs font-semibold">{action.name}</span>
                  {action.successRate && <span className="text-[10px] text-cyan-400">{action.successRate}%</span>}
                  {action.damage && <span className="text-[10px] text-orange-400">{action.damage}</span>}
                </div>
              ))}
              {data._actions.length > 3 && (
                <p className="text-gray-500 text-[10px] pl-2">+{data._actions.length - 3} autres...</p>
              )}
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="mb-3">
            <p className="text-gray-400 text-xs font-semibold mb-1">Objets ({items.length})</p>
            <div className="flex flex-wrap gap-1">
              {items.slice(0, 4).map((item) => (
                <span key={item.id} className="px-1.5 py-0.5 bg-amber-900 text-amber-300 text-[10px] rounded">
                  {item.name}
                </span>
              ))}
              {items.length > 4 && (
                <span className="px-1.5 py-0.5 text-gray-500 text-[10px]">+{items.length - 4}</span>
              )}
            </div>
          </div>
        )}

        {customFields.length > 0 && (
          <div className="space-y-0.5">
            {customFields.slice(0, 3).map(([key, value]) => (
              <div key={key} className="text-xs flex gap-1">
                <span className="text-gray-500 shrink-0">{key}:</span>
                <span className="text-gray-300 truncate">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex border-t border-gray-700">
          <button
            onClick={() => onEdit(character)}
            className="flex-1 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 transition"
          >
            Modifier
          </button>
          {isDeleting ? (
            <div className="flex border-l border-gray-700">
              <button
                onClick={() => onDeleteConfirm(character.id)}
                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-30 transition font-semibold"
              >
                Confirmer
              </button>
              <button
                onClick={onDeleteCancel}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => onDelete(character.id)}
              className="flex-1 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-gray-700 transition border-l border-gray-700"
            >
              Supprimer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
