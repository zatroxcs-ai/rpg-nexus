// frontend/src/pages/GameView.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import ChatBox from '../components/ChatBox';
import DiceRoller from '../components/DiceRoller';
import DiceHistory from '../components/DiceHistory';
import ModelList from '../components/ModelList';
import CharacterList from '../components/CharacterList';
import UICustomizer from '../components/UICustomizer';
import AssetManager from '../components/AssetManager';
import AnimationPlayer from '../components/AnimationPlayer';
import AnimationTrigger from '../components/AnimationTrigger';
import MonsterManager from '../components/MonsterManager';
import TacticalMap from '../components/TacticalMap';
import InvitePlayer from '../components/InvitePlayer';
import websocketService from '../services/websocket';

export default function GameView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentGame, gameState, players, isInGame, joinGame, leaveGame } = useGame();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAnimationTrigger, setShowAnimationTrigger] = useState(false);
  const [showInvitePlayer, setShowInvitePlayer] = useState(false);

  const isGameMaster = currentGame?.ownerId === user?.id;

  useEffect(() => {
    console.log('🎮 GameState mis à jour:', gameState);
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

  const handleLeave = () => {
    leaveGame();
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Connexion à la partie...</div>
      </div>
    );
  }

  // Onglets visibles par tous
  const baseTabs = [
    { id: 'chat',       label: '💬 Chat' },
    { id: 'dice',       label: '🎲 Dés' },
    { id: 'characters', label: '👤 Personnages' },
    { id: 'plateau',    label: '🗺️ Plateau' },
    { id: 'templates',  label: '📋 Templates' },
    { id: 'assets',     label: '📦 Fichiers' },
  ];

  // Onglets MJ uniquement
  const gmTabs = [
    { id: 'monsters', label: '🐉 Monstres' },
  ];

  const tabs = isGameMaster ? [...baseTabs, ...gmTabs] : baseTabs;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{currentGame?.name}</h1>
            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm">● En ligne</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">{players.length + 1} joueur(s) connecté(s)</div>

            {isGameMaster && (
              <button
                onClick={() => setShowInvitePlayer(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition flex items-center gap-2"
              >
                <span>➕</span>
                <span>Inviter</span>
              </button>
            )}

            {isGameMaster && (
              <button
                onClick={() => setShowCustomizer(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition flex items-center gap-2"
              >
                <span>⚙️</span>
                <span>Personnaliser</span>
              </button>
            )}

            {isGameMaster && (
              <button
                onClick={() => setShowAnimationTrigger(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition flex items-center gap-2"
              >
                <span>🎬</span>
                <span>Animations</span>
              </button>
            )}

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

        {/* Zone principale */}
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
              <div className="flex gap-1 flex-wrap">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3 font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-gray-700 text-white border-b-2 border-indigo-500'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
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
                    <h2 className="text-2xl font-bold mb-4">🎲 Lanceur de Dés</h2>
                    <DiceRoller />
                  </div>
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">📊 Historique</h2>
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

            {activeTab === 'plateau' && (
              <div className="h-full">
                <TacticalMap
                  isGameMaster={isGameMaster}
                  characters={gameState?.characters || []}
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

            {activeTab === 'monsters' && isGameMaster && (
              <div className="h-full">
                <MonsterManager gameId={gameId} />
              </div>
            )}

          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">

          {/* Joueurs */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold mb-3">👥 Joueurs</h3>
            <div className="space-y-2">
              {currentGame?.owner && (
                <div className="flex items-center gap-2 p-2 bg-purple-900 bg-opacity-30 rounded">
                  <div className="text-2xl">🎭</div>
                  <div>
                    <div className="font-semibold">{currentGame.owner.username}</div>
                    <div className="text-xs text-gray-400">Maître du Jeu</div>
                  </div>
                </div>
              )}
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-2 p-2 bg-gray-700 rounded">
                  <div className="text-2xl">⚔️</div>
                  <div>
                    <div className="font-semibold">{player.username}</div>
                    <div className="text-xs text-green-400">● En ligne</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">📖 Description</h3>
            <p className="text-sm text-gray-300">{currentGame?.description || 'Aucune description'}</p>
          </div>

          {/* Aperçu personnages */}
          {gameState?.characters && gameState.characters.length > 0 && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                👤 Personnages ({gameState.characters.length})
              </h3>
              <div className="space-y-1">
                {gameState.characters.slice(0, 5).map((char) => (
                  <div key={char.id} className="text-sm text-gray-300 truncate">• {char.name}</div>
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
              <div className="text-3xl">{user?.role === 'ADMIN' ? '🎭' : '⚔️'}</div>
              <div>
                <div className="font-semibold">{user?.username}</div>
                <div className="text-xs text-gray-400">
                  {user?.role === 'ADMIN' ? 'Maître du Jeu' : 'Joueur'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal invitation joueur */}
      {showInvitePlayer && (
        <InvitePlayer
          gameId={gameId}
          onClose={() => setShowInvitePlayer(false)}
          onInvited={() => setShowInvitePlayer(false)}
        />
      )}

      {/* Modal personnalisation */}
      {showCustomizer && (
        <UICustomizer
          gameId={gameId}
          currentStyles={currentGame?.customStyles}
          onClose={() => setShowCustomizer(false)}
          onSave={() => {
            setShowCustomizer(false);
            window.location.reload();
          }}
        />
      )}

      {/* Lecteur d'animations */}
      <AnimationPlayer animations={gameState?.animations || []} />

      {/* Modal animations */}
      {showAnimationTrigger && (
        <AnimationTrigger
          onTrigger={(animData) => {
            websocketService.triggerCssAnimation(gameId, animData);
          }}
          onClose={() => setShowAnimationTrigger(false)}
        />
      )}

    </div>
  );
}
