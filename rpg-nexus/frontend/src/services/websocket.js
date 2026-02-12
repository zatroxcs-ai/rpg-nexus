// 📍 Fichier : frontend/src/services/websocket.js
// 🎯 Rôle : Gère la connexion WebSocket et les événements temps réel
// 💡 Singleton - une seule instance pour toute l'application

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Connexion au serveur WebSocket
  connect(token) {
    if (this.socket?.connected) {
      console.log('🔌 Déjà connecté au WebSocket');
      return;
    }

    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Rattacher tous les listeners mis en file d'attente avant connect()
    this.listeners.forEach((callbacks, eventName) => {
      callbacks.forEach(cb => this.socket.on(eventName, cb));
    });

    this.setupDefaultListeners();
    console.log('🔌 Connexion WebSocket initialisée');
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('👋 Déconnecté du WebSocket');
    }
  }

  // Configuration des écouteurs par défaut
  setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connecté au serveur WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Déconnecté du serveur WebSocket');
    });

    this.socket.on('connected', (data) => {
      console.log('👤 Authentification réussie:', data.user.username);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Erreur WebSocket:', error.message);
    });
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // ÉMETTRE DES ÉVÉNEMENTS (Client → Serveur)
  // ╚═══════════════════════════════════════════════════════════╝

  // Rejoindre une partie
  joinGame(gameId) {
    if (!this.socket?.connected) {
      console.error('⚠️ WebSocket non connecté');
      return;
    }
    this.socket.emit('joinGame', { gameId });
    console.log(`🎮 Tentative de rejoindre la partie ${gameId}`);
  }

  // Quitter une partie
  leaveGame(gameId) {
    if (!this.socket?.connected) return;
    this.socket.emit('leaveGame', { gameId });
    console.log(`👋 Quitter la partie ${gameId}`);
  }

  // Déclencher une animation (MJ uniquement)
  // Envoyer un message de chat
  sendChatMessage(gameId, message) {
    if (!this.socket?.connected) {
      console.error('⚠️ WebSocket non connecté');
      return;
    }
    this.socket.emit('sendChatMessage', { gameId, message });
    console.log(`💬 Message envoyé : ${message}`);
  }

  // Lancer des dés
  rollDice(gameId, diceType, count, modifier = 0, reason = '') {
    if (!this.socket?.connected) {
      console.error('⚠️ WebSocket non connecté');
      return;
    }
    this.socket.emit('rollDice', {
      gameId,
      diceType,
      count,
      modifier,
      reason: reason || undefined,
    });
    console.log(`🎲 Lancer ${count}d${diceType}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''}`);
  }

  triggerAnimation(gameId, animationId) {
    if (!this.socket?.connected) return;
    this.socket.emit('triggerAnimation', { gameId, animationId });
    console.log(`✨ Animation DB déclenchée : ${animationId}`);
  }

  // Déclencher une animation CSS inline (sans DB)
  triggerCssAnimation(gameId, animData) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket non connecté, animation non envoyée');
      return;
    }
    this.socket.emit('triggerAnimation', { gameId, animation: animData });
    console.log(`✨ Animation CSS déclenchée : ${animData.effect}`);
  }

  // Mettre à jour un personnage
  updateCharacter(gameId, characterId, data) {
    if (!this.socket?.connected) return;
    this.socket.emit('updateCharacter', { gameId, characterId, data });
    console.log(`👤 Personnage mis à jour : ${characterId}`);
  }

  // Modifier les styles du jeu (MJ uniquement)
  updateGameStyles(gameId, customStyles) {
    if (!this.socket?.connected) return;
    this.socket.emit('updateGameStyles', { gameId, customStyles });
    console.log(`🎨 Styles mis à jour`);
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // ÉCOUTER DES ÉVÉNEMENTS (Serveur → Client)
  // ╚═══════════════════════════════════════════════════════════╝

  // Écouter un événement
  // Si le socket n'est pas encore créé, les listeners sont mis en file d'attente
  // et attachés automatiquement lors du connect()
  on(eventName, callback) {
    // Toujours stocker le listener
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    const existing = this.listeners.get(eventName);
    if (!existing.includes(callback)) {
      existing.push(callback);
    }

    // Attacher au socket si disponible, sinon il sera attaché dans connect()
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  // Retirer un écouteur
  off(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }

    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Retirer tous les écouteurs d'un événement
  removeAllListeners(eventName) {
    if (!this.socket) return;
    this.socket.removeAllListeners(eventName);
    this.listeners.delete(eventName);
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // HELPERS
  // ╚═══════════════════════════════════════════════════════════╝

  // Vérifier si connecté
  isConnected() {
    return this.socket?.connected || false;
  }

  // Obtenir l'instance du socket
  getSocket() {
    return this.socket;
  }
}

// Export d'une instance unique (Singleton)
const websocketService = new WebSocketService();
export default websocketService;
