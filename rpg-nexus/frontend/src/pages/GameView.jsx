// frontend/src/pages/GameView.jsx
// Vue de jeu en temps reel avec WebSocket, Chat et Des
// MJ: desktop layout avec onglets et sidebar
// Joueur: mobile-first layout avec bottom nav

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import websocketService from '../services/websocket';
import useDataSync from '../hooks/useDataSync';
import ChatBox from '../components/ChatBox';
import DiceRollerAdvanced from '../components/DiceRollerAdvanced';
import DiceHistory from '../components/DiceHistory';
import ModelList from '../components/ModelList';
import CharacterList from '../components/CharacterList';
import UICustomizer from '../components/UICustomizer';
import AssetManager from '../components/AssetManager';
import AnimationPlayer from '../components/AnimationPlayer';
import AnimationTrigger from '../components/AnimationTrigger';
import PlayerStats from '../components/PlayerStats';
import InvitePlayer from '../components/InvitePlayer';
import TacticalMap from '../components/TacticalMap';
import MonsterManager from '../components/MonsterManager';
import CombatManager from '../components/CombatManager';
import NoteManager from '../components/NoteManager';
import NpcManager from '../components/NpcManager';
import ItemManager from '../components/ItemManager';
import RelationMap from '../components/RelationMap';
import QuestManager from '../components/QuestManager';
import PlayerQuestView from '../components/PlayerQuestView';
import NotificationToast from '../components/NotificationToast';
import AmbientPlayer from '../components/AmbientPlayer';
import Dice3D from '../components/Dice3D';
import PlayerInventory from '../components/PlayerInventory';
import GameSettings from '../components/GameSettings';
import CharacterForm from '../components/CharacterForm';
import { characterAPI } from '../services/api';

const playerTabs = [
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'map',
    label: 'Plateau',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    id: 'perso',
    label: 'Perso',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'dice',
    label: 'Des',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9z" />
      </svg>
    ),
  },
  {
    id: 'combat',
    label: 'Combat',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'quests',
    label: 'Quetes',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

export default function GameView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentGame, gameState, players, isInGame, joinGame, leaveGame, triggerAnimation, triggerCssAnimation } = useGame();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAnimationTrigger, setShowAnimationTrigger] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [dice3d, setDice3d] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [needsCharacter, setNeedsCharacter] = useState(false);
  const [checkingCharacter, setCheckingCharacter] = useState(true);
  const lastDiceCountRef = useRef(0);

  const isGameMaster = currentGame?.ownerId === user?.id;

  useEffect(() => {
    console.log('GameState mis a jour:', gameState);
  }, [gameState]);

  useEffect(() => {
    const join = async () => {
      const result = await joinGame(gameId);
      if (!result.success) {
        alert(result.error);
        navigate(-1);
      }
      setLoading(false);
    };

    join();

    return () => {
      leaveGame();
    };
  }, [gameId]);

  // Ref stable pour éviter que dice3d dans les deps cause un reset de lastDiceCountRef
  const dice3dRef = useRef(null);
  useEffect(() => { dice3dRef.current = dice3d; }, [dice3d]);

  useEffect(() => {
    // Initialise le compteur au moment du montage seulement
    lastDiceCountRef.current = (websocketService.store.diceRolls || []).length;

    const unsub = websocketService.subscribeStore((store) => {
      const rolls = store.diceRolls || [];
      if (rolls.length > lastDiceCountRef.current && rolls.length > 0) {
        const latest = rolls[rolls.length - 1];
        lastDiceCountRef.current = rolls.length;
        // Affiche l'animation si aucune animation en cours
        // (pour tout le monde dans la room, pas seulement soi-même)
        if (!dice3dRef.current) {
          setDice3d({
            diceType: latest.diceType || 20,
            result: Array.isArray(latest.results) ? latest.results[0] : latest.total,
            total: latest.total,
            formula: latest.formula,
            username: latest.username,
          });
        }
      }
    });

    return unsub;
  }, []); // ← dépendances vides : subscription stable, jamais re-créée

  useEffect(() => {
    if (!user?.id || !gameId || loading) return;
    if (isGameMaster) {
      setCheckingCharacter(false);
      return;
    }
    const checkCharacter = async () => {
      try {
        const chars = await characterAPI.getByGame(gameId);
        const mine = chars.find(c => c.ownerId === user.id);
        if (mine) {
          setPlayerChar(mine);
          setNeedsCharacter(false);
        } else {
          setNeedsCharacter(true);
        }
      } catch (e) {
        console.error('Failed to check character:', e);
        setNeedsCharacter(false);
      } finally {
        setCheckingCharacter(false);
      }
    };
    checkCharacter();
  }, [user?.id, gameId, isGameMaster, loading]);

  const [playerChar, setPlayerChar] = useState(null);

  const syncPlayerChar = useCallback(() => {
    if (!user?.id || !gameId || isGameMaster) return;
    characterAPI.getByGame(gameId).then(chars => {
      const mine = chars.find(c => c.ownerId === user.id);
      if (mine) setPlayerChar(mine);
    }).catch(() => {});
  }, [user?.id, gameId, isGameMaster]);
  useDataSync('character', syncPlayerChar);

  const handleCharacterCreated = async (charData) => {
    await characterAPI.create(charData);
    const chars = await characterAPI.getByGame(gameId);
    const mine = chars.find(c => c.ownerId === user.id);
    if (mine) setPlayerChar(mine);
    setNeedsCharacter(false);
  };

  const handleLeave = () => {
    leaveGame();
    navigate(-1);
  };

  const tabButtonClass = (tabName) =>
    `px-6 py-3 font-semibold transition whitespace-nowrap ${
      activeTab === tabName
        ? 'bg-gray-700 text-white border-b-2 border-indigo-500'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
    }`;

  if (loading || checkingCharacter) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Connexion a la partie...</div>
      </div>
    );
  }

  // ─── CHARACTER CREATION GATE (first-time player) ──────────────────────────
  if (!isGameMaster && needsCharacter) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col pb-14">
        <header className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold truncate">{currentGame?.name}</h1>
            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
          </div>
          <button
            onClick={handleLeave}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs font-semibold flex-shrink-0"
          >
            Quitter
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">
                  <svg className="w-16 h-16 mx-auto text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Creez votre personnage</h2>
                <p className="text-gray-400 mt-2">
                  Avant de rejoindre l'aventure, vous devez creer votre personnage.
                  Choisissez un template et remplissez les informations.
                </p>
              </div>
              <CharacterForm
                gameId={gameId}
                character={null}
                isGameMaster={false}
                onSubmit={handleCharacterCreated}
                onCancel={handleLeave}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYER VIEW (mobile-first) ─────────────────────────────────────────────
  if (!isGameMaster) {
    const charData = playerChar?.data || {};
    const hp = charData['HP'] ?? null;
    const hpMax = charData['HP Max'] ?? null;
    const hpPercent = hp !== null && hpMax ? Math.max(0, Math.min(100, Math.round((hp / hpMax) * 100))) : null;
    const hpColor = hpPercent !== null
      ? hpPercent > 60 ? 'bg-green-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-red-500'
      : '';
    const charAvatar = playerChar?.avatar
      ? (playerChar.avatar.startsWith('http') ? playerChar.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${playerChar.avatar}`)
      : null;

    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col pb-14">
        {/* Header enrichi */}
        <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <div className="px-3 py-2 flex items-center gap-3">
            {playerChar ? (
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {charAvatar ? (
                  <img src={charAvatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-indigo-500 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-900 border-2 border-indigo-500 flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0">
                    {playerChar.name?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate">{playerChar.name}</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                  </div>
                  {hpPercent !== null && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{hp}/{hpMax}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="text-sm font-bold truncate">{currentGame?.name}</h1>
                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
              </div>
            )}
            <button
              onClick={handleLeave}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs font-semibold shrink-0"
            >
              Quitter
            </button>
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <div className="h-full">
              <ChatBox />
            </div>
          )}

          {activeTab === 'map' && (
            <div className="h-full">
              <TacticalMap isGameMaster={false} characters={gameState?.characters || []} />
            </div>
          )}

          {activeTab === 'perso' && (
            <div className="h-full overflow-y-auto">
              <PlayerInventory gameId={gameId} />
              <div className="p-4">
                <PlayerStats />
              </div>
            </div>
          )}

          {activeTab === 'dice' && (
            <div className="h-full overflow-y-auto p-4 space-y-4">
              <DiceRollerAdvanced />
              <DiceHistory />
            </div>
          )}

          {activeTab === 'combat' && (
            <div className="h-full overflow-y-auto">
              <CombatManager gameId={gameId} isGameMaster={false} triggerCssAnimation={triggerCssAnimation} />
            </div>
          )}

          {activeTab === 'quests' && (
            <div className="h-full overflow-y-auto">
              <PlayerQuestView gameId={gameId} />
            </div>
          )}
        </div>

        {/* Bottom navigation amelioree */}
        <nav className="bg-gray-900 border-t border-gray-700 flex-shrink-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          <div className="flex">
            {playerTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center py-2 pt-2.5 min-h-[52px] transition relative ${
                    isActive ? 'text-indigo-400' : 'text-gray-500 active:text-gray-300'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-400 rounded-full" />
                  )}
                  <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                    {tab.icon}
                  </span>
                  <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-indigo-300' : ''}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Overlays */}
        <AnimationPlayer animations={gameState?.animations || []} />
        <NotificationToast />
        <AmbientPlayer gameId={gameId} isGameMaster={false} />
        {dice3d && (
          <Dice3D
            diceType={dice3d.diceType}
            result={dice3d.result}
            total={dice3d.total}
            formula={dice3d.formula}
            username={dice3d.username}
            onComplete={() => setDice3d(null)}
          />
        )}
      </div>
    );
  }

  // ─── MJ VIEW (desktop - existing layout) ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col pb-16">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{currentGame?.name}</h1>
            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm">
              En ligne
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">
              {players.filter(p => p.id !== currentGame?.ownerId).length + 1} joueur(s) connecte(s)
            </div>

            <button
              onClick={() => setShowCustomizer(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition flex items-center gap-2"
            >
              Personnaliser
            </button>
            <button
              onClick={() => setShowAnimationTrigger(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition flex items-center gap-2"
            >
              Animations
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition flex items-center gap-2"
            >
              Inviter Joueur
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Options
            </button>

            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Zone principale avec onglets */}
        <div
          className="flex-1 flex flex-col"
          style={{
            backgroundColor: currentGame?.customStyles?.backgroundColor,
            backgroundImage: currentGame?.customStyles?.backgroundImage
              ? `url(${currentGame.customStyles.backgroundImage})`
              : 'none',
            backgroundSize: currentGame?.customStyles?.backgroundSize || 'cover',
            backgroundPosition: currentGame?.customStyles?.backgroundPosition || 'center',
          }}
        >
          {/* Onglets */}
          <div className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-2 overflow-x-auto">
                <button onClick={() => setActiveTab('chat')} className={tabButtonClass('chat')}>
                  Chat
                </button>
                <button onClick={() => setActiveTab('dice')} className={tabButtonClass('dice')}>
                  Des
                </button>
                <button onClick={() => setActiveTab('characters')} className={tabButtonClass('characters')}>
                  Personnages
                </button>
                <button onClick={() => setActiveTab('templates')} className={tabButtonClass('templates')}>
                  Templates
                </button>
                <button onClick={() => setActiveTab('assets')} className={tabButtonClass('assets')}>
                  Fichiers
                </button>
                <button onClick={() => setActiveTab('stats')} className={tabButtonClass('stats')}>
                  Mes Stats
                </button>
                <button onClick={() => setActiveTab('map')} className={tabButtonClass('map')}>
                  Plateau
                </button>
                <button onClick={() => setActiveTab('combat')} className={tabButtonClass('combat')}>
                  Combat
                </button>
                <button onClick={() => setActiveTab('quests')} className={tabButtonClass('quests')}>
                  Quetes
                </button>
                <button onClick={() => setActiveTab('notes')} className={tabButtonClass('notes')}>
                  Notes
                </button>
                <button onClick={() => setActiveTab('relations')} className={tabButtonClass('relations')}>
                  Relations
                </button>
                <button onClick={() => setActiveTab('monsters')} className={tabButtonClass('monsters')}>
                  Monstres
                </button>
                <button onClick={() => setActiveTab('npcs')} className={tabButtonClass('npcs')}>
                  PNJ
                </button>
                <button onClick={() => setActiveTab('items')} className={tabButtonClass('items')}>
                  Items
                </button>
              </div>
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <div className="h-full">
                <ChatBox />
              </div>
            )}

            {activeTab === 'dice' && (
              <div className="h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
                    <h2 className="text-2xl font-bold mb-4">Lanceur de Des</h2>
                    <DiceRollerAdvanced />
                  </div>
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Historique</h2>
                    <DiceHistory />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="h-full overflow-y-auto">
                <CharacterList
                  gameId={gameId}
                  currentUserId={user?.id}
                  isGameMaster={isGameMaster}
                />
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="h-full overflow-y-auto">
                <div className="max-w-7xl mx-auto p-6">
                  <ModelList gameId={gameId} ownerId={currentGame?.ownerId} />
                </div>
              </div>
            )}

            {activeTab === 'assets' && (
              <div className="h-full overflow-y-auto">
                <AssetManager
                  gameId={gameId}
                  currentUserId={user?.id}
                  isGameMaster={isGameMaster}
                />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                  <h2 className="text-2xl font-bold mb-6">Mes Statistiques de Des</h2>
                  <PlayerStats />
                </div>
              </div>
            )}

            {activeTab === 'map' && (
              <div className="h-full">
                <TacticalMap
                  isGameMaster={isGameMaster}
                  characters={gameState?.characters || []}
                />
              </div>
            )}

            {activeTab === 'combat' && (
              <div className="h-full overflow-y-auto">
                <CombatManager
                  gameId={gameId}
                  isGameMaster={isGameMaster}
                  triggerCssAnimation={triggerCssAnimation}
                />
              </div>
            )}

            {activeTab === 'quests' && (
              <div className="h-full">
                <QuestManager gameId={gameId} />
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="h-full overflow-y-auto">
                <NoteManager
                  gameId={gameId}
                  isGameMaster={isGameMaster}
                />
              </div>
            )}

            {activeTab === 'relations' && (
              <div className="h-full overflow-y-auto">
                <RelationMap
                  gameId={gameId}
                  isGameMaster={isGameMaster}
                />
              </div>
            )}

            {activeTab === 'monsters' && (
              <div className="h-full overflow-y-auto">
                <MonsterManager gameId={gameId} />
              </div>
            )}

            {activeTab === 'npcs' && (
              <div className="h-full overflow-y-auto">
                <NpcManager gameId={gameId} />
              </div>
            )}

            {activeTab === 'items' && (
              <div className="h-full overflow-y-auto">
                <ItemManager gameId={gameId} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar : Joueurs */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Liste des joueurs */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold mb-3">Joueurs</h3>
            <div className="space-y-2">
              {/* Owner (MJ) */}
              {currentGame?.owner && (
                <div className="flex items-center gap-2 p-2 bg-purple-900 bg-opacity-30 rounded">
                  <div className="text-2xl">MJ</div>
                  <div>
                    <div className="font-semibold">{currentGame.owner.username}</div>
                    <div className="text-xs text-gray-400">Maitre du Jeu</div>
                  </div>
                </div>
              )}

              {/* Joueurs connectes - exclure le MJ qui est déjà affiché au dessus */}
              {players
                .filter(p => p.id !== currentGame?.ownerId)
                .map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 bg-gray-700 rounded"
                  >
                    <div className="text-2xl">PJ</div>
                    <div>
                      <div className="font-semibold">{player.username}</div>
                      <div className="text-xs text-green-400">● En ligne</div>
                    </div>
                  </div>
                ))}
              {/* Joueurs invités mais non connectés */}
              {(currentGame?.players || [])
                .map(gp => gp.player)
                .filter(p => p && p.id !== currentGame?.ownerId && !players.find(pl => pl.id === p.id))
                .map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 bg-gray-700 bg-opacity-50 rounded"
                  >
                    <div className="text-2xl opacity-40">PJ</div>
                    <div>
                      <div className="font-semibold text-gray-400">{player.username}</div>
                      <div className="text-xs text-gray-500">● Hors ligne</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Infos de la partie */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Description</h3>
            <p className="text-sm text-gray-300">
              {currentGame?.description || 'Aucune description'}
            </p>
          </div>

          {/* Personnages de la partie (apercu) */}
          {gameState?.characters && gameState.characters.length > 0 && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Personnages ({gameState.characters.length})
              </h3>
              <div className="space-y-1">
                {gameState.characters.slice(0, 5).map((char) => (
                  <div
                    key={char.id}
                    className="text-sm text-gray-300 truncate"
                  >
                    {char.name}
                  </div>
                ))}
                {gameState.characters.length > 5 && (
                  <div className="text-xs text-gray-500 italic">
                    +{gameState.characters.length - 5} autres...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Infos utilisateur */}
          <div className="mt-auto p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {user?.role === 'ADMIN' ? 'MJ' : 'PJ'}
              </div>
              <div>
                <div className="font-semibold">{user?.username}</div>
                <div className="text-xs text-gray-400">
                  {user?.role === 'ADMIN' ? 'Maitre du Jeu' : 'Joueur'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de personnalisation */}
      {showCustomizer && (
        <UICustomizer
          gameId={gameId}
          currentStyles={currentGame?.customStyles}
          onClose={() => setShowCustomizer(false)}
          onSave={async (newStyles) => {
            console.log('Rechargement de la partie...');
            setShowCustomizer(false);
            window.location.reload();
          }}
        />
      )}

      {/* Lecteur d'animations (toujours actif) */}
      <AnimationPlayer animations={gameState?.animations || []} />

      {/* Modal de declenchement d'animations */}
      {showAnimationTrigger && (
        <AnimationTrigger
          onTrigger={(animData) => {
            triggerCssAnimation(animData);
          }}
          onClose={() => setShowAnimationTrigger(false)}
        />
      )}

      {/* Modal d'invitation */}
      {showInviteModal && (
        <InvitePlayer
          gameId={gameId}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => {
            console.log('Joueur invite !');
          }}
        />
      )}

      {/* Notifications en temps reel */}
      <NotificationToast />

      {/* Lecteur audio ambiance */}
      <AmbientPlayer gameId={gameId} isGameMaster={isGameMaster} />

      {/* De 3D anime lors d'un lancer */}
      {dice3d && (
        <Dice3D
          diceType={dice3d.diceType}
          result={dice3d.result}
          total={dice3d.total}
          formula={dice3d.formula}
          username={dice3d.username}
          onComplete={() => setDice3d(null)}
        />
      )}
      {showSettings && (
        <GameSettings
          gameId={gameId}
          game={currentGame}
          players={players}
          onClose={() => setShowSettings(false)}
          onGameUpdated={() => window.location.reload()}
          onNavigate={(path) => navigate(path)}
        />
      )}
    </div>
  );
}
