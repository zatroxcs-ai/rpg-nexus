// @refresh reset
// frontend/src/contexts/GameContext.jsx

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { GameContext } from './GameContextDef';
import websocketService from '../services/websocket';
import { gameAPI } from '../services/api';

export { GameContext };

export const GameProvider = ({ children }) => {

  // Initialisés depuis le store persistant — survivent au HMR
  const [currentGame, setCurrentGame] = useState(() => websocketService.store.currentGame);
  const [gameState,   setGameState]   = useState(null);
  const [players,     setPlayers]     = useState([]);
  const [isInGame,    setIsInGame]    = useState(() => websocketService.store.isInGame);

  // Ref pour accéder à currentGame dans les callbacks sans re-créer les listeners
  const currentGameRef = useRef(websocketService.store.currentGame);

  // Synchronise ref + store à chaque changement
  useEffect(() => {
    currentGameRef.current             = currentGame;
    websocketService.store.currentGame = currentGame;
    websocketService.store.isInGame    = !!currentGame;
  }, [currentGame]);

  // ─────────────────────────────────────────
  // REJOINDRE / QUITTER
  // ─────────────────────────────────────────

  const joinGame = useCallback(async (gameId) => {
    try {
      const game = await gameAPI.getGameById(gameId);
      setCurrentGame(game);
      setIsInGame(true);

      // Init depuis l'API = tous les invités (base), sera affiné par connectedPlayers
      const playerList = (game.players || [])
        .map(p => p.player)
        .filter(Boolean);
      setPlayers(playerList);

      websocketService.joinGame(gameId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Impossible de rejoindre la partie',
      };
    }
  }, []);

  const leaveGame = useCallback(() => {
    if (currentGameRef.current) {
      websocketService.leaveGame(currentGameRef.current.id);
    }
    setCurrentGame(null);
    setGameState(null);
    setPlayers([]);
    setIsInGame(false);
  }, []);

  // ─────────────────────────────────────────
  // ACTIONS — lisent currentGame via ref
  // ─────────────────────────────────────────

  const sendMessage = useCallback((content) => {
    if (currentGameRef.current && content?.trim()) {
      websocketService.sendChatMessage(currentGameRef.current.id, content);
    }
  }, []);

  const rollDice = useCallback((diceType, count, modifier = 0, reason = '') => {
    if (currentGameRef.current) {
      websocketService.rollDice(currentGameRef.current.id, diceType, count, modifier, reason);
    }
  }, []);

  const triggerAnimation = useCallback((animationId) => {
    if (currentGameRef.current) {
      websocketService.triggerAnimation(currentGameRef.current.id, animationId);
    }
  }, []);

  const triggerCssAnimation = useCallback((animData) => {
    if (currentGameRef.current) {
      websocketService.triggerCssAnimation(currentGameRef.current.id, animData);
    }
  }, []);

  const updateCharacter = useCallback((characterId, data) => {
    if (currentGameRef.current) {
      websocketService.updateCharacter(currentGameRef.current.id, characterId, data);
    }
  }, []);

  const updateStyles = useCallback((customStyles) => {
    if (currentGameRef.current) {
      websocketService.updateGameStyles(currentGameRef.current.id, customStyles);
    }
  }, []);

  // ─────────────────────────────────────────
  // ÉVÉNEMENTS WEBSOCKET
  // deps=[] : enregistré UNE SEULE FOIS au montage.
  // chatMessage et diceRolled sont gérés directement dans websocket.js
  // ─────────────────────────────────────────

  useEffect(() => {
    const handleGameState = (state) => {
      console.log('📊 État du jeu reçu:', state);
      setGameState(state);
      // Mettre à jour le statut en ligne avec les joueurs réellement connectés
      // mais garder tous les invités dans la liste (pour afficher hors ligne aussi)
      if (Array.isArray(state.connectedPlayers)) {
        setPlayers(prev => prev.map(p => ({
          ...p,
          online: state.connectedPlayers.some(cp => cp.id === p.id),
        })));
      }
    };

    const handlePlayerJoined = (data) => {
      console.log('👥 Joueur rejoint:', data.player.username);
      setPlayers(prev => {
        const exists = prev.find(p => p.id === data.player.id);
        if (exists) {
          // Marquer comme en ligne
          return prev.map(p => p.id === data.player.id ? { ...p, online: true } : p);
        }
        // Nouveau joueur pas encore dans la liste
        return [...prev, { ...data.player, online: true }];
      });
    };

    const handlePlayerLeft = (data) => {
      console.log('👋 Joueur parti:', data.playerId);
      // Marquer hors ligne plutôt que retirer (pour garder la liste des invités)
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId ? { ...p, online: false } : p
      ));
    };

    const handleAnimationTriggered = (data) => {
      console.log('✨ Animation reçue:', data.animation);
      const anim = { ...data.animation, _uid: `${Date.now()}${Math.random()}` };
      setGameState(prev => ({
        ...prev,
        animations: [...(prev?.animations || []), anim],
      }));
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          animations: (prev?.animations || []).filter(a => a._uid !== anim._uid),
        }));
      }, anim.duration || 2000);
    };

    const handleCharacterUpdated = (data) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          characters: prev.characters?.map(char =>
            char.id === data.character.id ? { ...char, ...data.character } : char
          ),
        };
      });
    };

    const handleGameStylesUpdated = (data) => {
      setCurrentGame(prev => prev ? { ...prev, customStyles: data.customStyles } : prev);
    };

    const handleNotification = (data) => {
      console.log(`📢 ${data.type}:`, data.message);
    };

    websocketService.on('gameState',          handleGameState);
    websocketService.on('playerJoined',       handlePlayerJoined);
    websocketService.on('playerLeft',         handlePlayerLeft);
    websocketService.on('animationTriggered', handleAnimationTriggered);
    websocketService.on('characterUpdated',   handleCharacterUpdated);
    websocketService.on('gameStylesUpdated',  handleGameStylesUpdated);
    websocketService.on('notification',       handleNotification);

    return () => {
      websocketService.off('gameState',          handleGameState);
      websocketService.off('playerJoined',       handlePlayerJoined);
      websocketService.off('playerLeft',         handlePlayerLeft);
      websocketService.off('animationTriggered', handleAnimationTriggered);
      websocketService.off('characterUpdated',   handleCharacterUpdated);
      websocketService.off('gameStylesUpdated',  handleGameStylesUpdated);
      websocketService.off('notification',       handleNotification);
    };
  }, []);

  const value = {
    currentGame,
    gameState,
    players,
    isInGame,
    joinGame,
    leaveGame,
    sendMessage,
    rollDice,
    triggerAnimation,
    triggerCssAnimation,
    updateCharacter,
    updateStyles,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame doit être utilisé dans un GameProvider');
  return context;
};
