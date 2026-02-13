// frontend/src/services/websocket.js
// Singleton - persiste à travers les remounts React et le HMR Vite

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.pendingListeners = new Map();
    this.isConnecting = false;

    // Store persistant — survit aux remounts React et HMR
    this.store = {
      messages:    [],
      diceRolls:   [],
      currentGame: null,
      isInGame:    false,
      activeCombat: null,
      lastCombatAction: null,
    };

    this._storeSubscribers = new Set();
    this._dataChangedSubscribers = new Map();
  }

  // ─────────────────────────────────────────
  // SUBSCRIPTION DIRECTE AU STORE
  // Permet à ChatBox/DiceHistory de s'abonner sans passer par Context
  // ─────────────────────────────────────────

  subscribeStore(fn) {
    this._storeSubscribers.add(fn);
    return () => this._storeSubscribers.delete(fn);
  }

  _notifyStore() {
    this._storeSubscribers.forEach(fn => fn({ ...this.store }));
  }

  onDataChanged(dataType, callback) {
    if (!this._dataChangedSubscribers.has(dataType)) {
      this._dataChangedSubscribers.set(dataType, new Set());
    }
    this._dataChangedSubscribers.get(dataType).add(callback);
    return () => this.offDataChanged(dataType, callback);
  }

  offDataChanged(dataType, callback) {
    const subs = this._dataChangedSubscribers.get(dataType);
    if (subs) subs.delete(callback);
  }

  _notifyDataChanged(dataType) {
    const subs = this._dataChangedSubscribers.get(dataType);
    if (subs) subs.forEach(fn => fn(dataType));
    const allSubs = this._dataChangedSubscribers.get('*');
    if (allSubs) allSubs.forEach(fn => fn(dataType));
  }

  // ─────────────────────────────────────────
  // CONNEXION
  // ─────────────────────────────────────────

  connect(token) {
    if (this.socket?.connected)  return;
    if (this.isConnecting)       return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;

    // En prod Railway, VITE_API_URL est défini. En dev, localhost:3000
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.socket = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Attacher tous les listeners enregistrés avant connect()
    this.pendingListeners.forEach((callbacks, eventName) => {
      callbacks.forEach(cb => this.socket.on(eventName, cb));
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('✅ Connecté au serveur WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Déconnecté du serveur WebSocket');
    });

    this.socket.on('connected', (data) => {
      console.log('👤 Authentification réussie:', data.user.username);
    });

    // Messages chat — capturés directement dans le service
    this.socket.on('chatMessage', (data) => {
      this.store.messages = [...this.store.messages, data.message];
      this._notifyStore();
    });

    this.socket.on('chatHistory', (data) => {
      this.store.messages = data.messages || [];
      this._notifyStore();
    });

    // Dés — capturés directement dans le service
    this.socket.on('diceRolled', (data) => {
      this.store.diceRolls = [...this.store.diceRolls, data.roll];
      this._notifyStore();
    });

    // Combat — capturés directement dans le service
    this.socket.on('combatUpdate', (data) => {
      this.store.activeCombat = data.combat;
      this._notifyStore();
    });

    this.socket.on('combatAction', (data) => {
      this.store.lastCombatAction = data.action;
      this._notifyStore();
    });

    this.socket.on('combatEnd', (data) => {
      this.store.activeCombat = null;
      this._notifyStore();
    });

    this.socket.on('gameDataChanged', (data) => {
      console.log(`[SYNC] gameDataChanged: ${data.dataType}`);
      this._notifyDataChanged(data.dataType);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Erreur WebSocket:', error.message);
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
      console.error('❌ Erreur de connexion:', err.message);
    });

    console.log('🔌 Connexion WebSocket initialisée');
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
    this.store.messages    = [];
    this.store.diceRolls   = [];
    this.store.currentGame = null;
    this.store.isInGame    = false;
    this._notifyStore();
    console.log('👋 Déconnecté du WebSocket');
  }

  // ─────────────────────────────────────────
  // ÉMETTRE (Client → Serveur)
  // ─────────────────────────────────────────

  joinGame(gameId) {
    if (!this.socket?.connected) { console.error('⚠️ WebSocket non connecté'); return; }
    this.socket.emit('joinGame', { gameId });
    console.log(`🎮 Tentative de rejoindre la partie ${gameId}`);
  }

  leaveGame(gameId) {
    if (!this.socket?.connected) return;
    this.socket.emit('leaveGame', { gameId });
    this.store.messages    = [];
    this.store.diceRolls   = [];
    this.store.currentGame = null;
    this.store.isInGame    = false;
    this._notifyStore();
    console.log(`👋 Quitter la partie ${gameId}`);
  }

  sendChatMessage(gameId, message) {
    if (!this.socket?.connected) { console.error('⚠️ WebSocket non connecté'); return; }
    this.socket.emit('sendChatMessage', { gameId, message });
    console.log(`💬 Message envoyé : ${message}`);
  }

  sendWhisper(gameId, targetUserId, message) {
    if (!this.socket?.connected) { console.error('⚠️ WebSocket non connecté'); return; }
    this.socket.emit('whisper', { gameId, targetUserId, message });
  }

  rollDice(gameId, diceType, count, modifier = 0, reason = '') {
    if (!this.socket?.connected) { console.error('⚠️ WebSocket non connecté'); return; }
    this.socket.emit('rollDice', {
      gameId, diceType, count, modifier,
      reason: reason || undefined,
    });
    console.log(`🎲 Lancer ${count}d${diceType}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''}`);
  }

  triggerAnimation(gameId, animationId) {
    if (!this.socket?.connected) return;
    this.socket.emit('triggerAnimation', { gameId, animationId });
    console.log(`✨ Animation DB : ${animationId}`);
  }

  triggerCssAnimation(gameId, animData) {
    if (!this.socket?.connected) { console.warn('⚠️ Socket non connecté'); return; }
    this.socket.emit('triggerAnimation', { gameId, animation: animData });
    console.log(`✨ Animation CSS : ${animData.effect}`);
  }

  updateCharacter(gameId, characterId, data) {
    if (!this.socket?.connected) return;
    this.socket.emit('updateCharacter', { gameId, characterId, data });
    console.log(`👤 Personnage mis à jour : ${characterId}`);
  }

  updateGameStyles(gameId, customStyles) {
    if (!this.socket?.connected) return;
    this.socket.emit('updateGameStyles', { gameId, customStyles });
    console.log(`🎨 Styles mis à jour`);
  }

  playAudio(gameId, url, name, volume = 0.5, loop = false) {
    if (!this.socket?.connected) return;
    this.socket.emit('playAudio', { gameId, url, name, volume, loop });
  }

  stopAudio(gameId) {
    if (!this.socket?.connected) return;
    this.socket.emit('stopAudio', { gameId });
  }

  setAudioVolume(gameId, volume) {
    if (!this.socket?.connected) return;
    this.socket.emit('setAudioVolume', { gameId, volume });
  }

  // ─────────────────────────────────────────
  // ÉCOUTER (Serveur → Client) — pour GameContext
  // ─────────────────────────────────────────

  on(eventName, callback) {
    // Évite de re-enregistrer chatMessage/diceRolled (déjà gérés dans connect())
    if (eventName === 'chatMessage' || eventName === 'diceRolled') return;

    if (!this.pendingListeners.has(eventName)) {
      this.pendingListeners.set(eventName, []);
    }
    const list = this.pendingListeners.get(eventName);
    if (!list.includes(callback)) {
      list.push(callback);
    }
    if (this.socket) {
      this.socket.off(eventName, callback);
      this.socket.on(eventName, callback);
    }
  }

  off(eventName, callback) {
    if (eventName === 'chatMessage' || eventName === 'diceRolled') return;
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
    if (this.pendingListeners.has(eventName)) {
      const list = this.pendingListeners.get(eventName);
      const idx  = list.indexOf(callback);
      if (idx > -1) list.splice(idx, 1);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const websocketService = new WebSocketService();
export default websocketService;
