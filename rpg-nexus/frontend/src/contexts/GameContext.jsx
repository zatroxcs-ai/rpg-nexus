// @refresh reset
// frontend/src/contexts/GameContext.jsx

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import websocketService from '../services/websocket';
import { gameAPI } from '../services/api';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const [currentGame, setCurrentGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [diceRolls, setDiceRolls] = useState([]);
  const [isInGame, setIsInGame] = useState(false);

  // ═══════════════════════════════════════
  // REJOINDRE / QUITTER
  // ═══════════════════════════════════════

  const joinGame = useCallback(async (gameId) => {
    try {
      const game = await gameAPI.getGameById(gameId);
      setCurrentGame(game);
      websocketService.joinGame(gameId);
      setIsInGame(true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Impossible de rejoindre la partie',
      };
    }
  }, []);

  const leaveGame = useCallback(() => {
    if (currentGame) {
      websocketService.leaveGame(currentGame.id);
      setCurrentGame(null);
      setGameState(null);
      setPlayers([]);
      setMessages([]);
      setDiceRolls([]);
      setIsInGame(false);
    }
  }, [currentGame]);

  // ═══════════════════════════════════════
  // CHAT
  // ═══════════════════════════════════════

  const sendMessage = useCallback((content) => {
    if (currentGame && content.trim()) {
      websocketService.sendChatMessage(currentGame.id, content);
    }
  }, [currentGame]);

  // ═══════════════════════════════════════
  // DICES
  // ═══════════════════════════════════════

  const rollDice = useCallback((diceType, count, modifier = 0, reason = '') => {
    if (currentGame) {
      websocketService.rollDice(currentGame.id, diceType, count, modifier, reason);
    }
  }, [currentGame]);

  // ═══════════════════════════════════════
  // ACTIONS MJ
  // ═══════════════════════════════════════

  const triggerAnimation = useCallback((animationId) => {
    if (currentGame) {
      websocketService.triggerAnimation(currentGame.id, animationId);
    }
  }, [currentGame]);

  const updateCharacter = useCallback((characterId, data) => {
    if (currentGame) {
      websocketService.updateCharacter(currentGame.id, characterId, data);
    }
  }, [currentGame]);

  const updateStyles = useCallback((customStyles) => {
    if (currentGame) {
      websocketService.updateGameStyles(currentGame.id, customStyles);
    }
  }, [currentGame]);

  // ═══════════════════════════════════════
  // ÉVÉNEMENTS WEBSOCKET
  // ═══════════════════════════════════════

  useEffect(() => {
    const handleGameState = (state) => {
      console.log('📊 État du jeu reçu:', state);
      setGameState(state);
    };

    const handlePlayerJoined = (data) => {
      console.log('👥 Joueur rejoint:', data.player.username);
      setPlayers((prev) => {
        if (prev.find(p => p.id === data.player.id)) return prev;
        return [...prev, data.player];
      });
    };

    const handlePlayerLeft = (data) => {
      console.log('👋 Joueur parti:', data.playerId);
      setPlayers((prev) => prev.filter(p => p.id !== data.playerId));
    };

    const handleChatMessage = (data) => {
      console.log('💬 Message reçu:', data.message.content);
      setMessages((prev) => [...prev, data.message]);
    };

    const handleDiceRolled = (data) => {
      console.log('🎲 Dés lancés:', data.roll.total);
      setDiceRolls((prev) => [...prev, data.roll]);
    };

    // Animation CSS inline — cycle de vie géré ici
    const handleAnimationTriggered = (data) => {
      console.log('✨ Animation reçue:', data.animation);
      const anim = { ...data.animation, _uid: Date.now().toString() + Math.random() };
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
      console.log('👤 Personnage mis à jour:', data.character.name);
      setGameState((prev) => {
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
      console.log('🎨 Styles mis à jour');
      setCurrentGame((prev) => prev ? { ...prev, customStyles: data.customStyles } : prev);
    };

    const handleNotification = (data) => {
      console.log(`📢 ${data.type}:`, data.message);
    };

    websocketService.on('gameState',          handleGameState);
    websocketService.on('playerJoined',       handlePlayerJoined);
    websocketService.on('playerLeft',         handlePlayerLeft);
    websocketService.on('chatMessage',        handleChatMessage);
    websocketService.on('diceRolled',         handleDiceRolled);
    websocketService.on('animationTriggered', handleAnimationTriggered);
    websocketService.on('characterUpdated',   handleCharacterUpdated);
    websocketService.on('gameStylesUpdated',  handleGameStylesUpdated);
    websocketService.on('notification',       handleNotification);

    return () => {
      websocketService.off('gameState',          handleGameState);
      websocketService.off('playerJoined',       handlePlayerJoined);
      websocketService.off('playerLeft',         handlePlayerLeft);
      websocketService.off('chatMessage',        handleChatMessage);
      websocketService.off('diceRolled',         handleDiceRolled);
      websocketService.off('animationTriggered', handleAnimationTriggered);
      websocketService.off('characterUpdated',   handleCharacterUpdated);
      websocketService.off('gameStylesUpdated',  handleGameStylesUpdated);
      websocketService.off('notification',       handleNotification);
    };
  }, [currentGame]);

  // ═══════════════════════════════════════
  // VALUE
  // ═══════════════════════════════════════

  const value = {
    currentGame,
    gameState,
    players,
    messages,
    diceRolls,
    isInGame,
    joinGame,
    leaveGame,
    sendMessage,
    rollDice,
    triggerAnimation,
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

