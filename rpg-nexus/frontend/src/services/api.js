// 📍 Fichier : frontend/src/services/api.js
// 🎯 Rôle : Gère tous les appels HTTP vers le backend
// 💡 Utilise Axios avec interception automatique du token JWT

import axios from 'axios';

// Configuration de base
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur : Ajoute automatiquement le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur : Gère les erreurs 401 (token expiré)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalide ou expiré
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════
// AUTHENTIFICATION
// ═══════════════════════════════════════════════════════

export const authAPI = {
  // Inscription
  register: async (email, username, password, role = 'PLAYER') => {
    const response = await api.post('/auth/register', {
      email,
      username,
      password,
      role,
    });
    return response.data;
  },

  // Connexion
  login: async (emailOrUsername, password) => {
    const response = await api.post('/auth/login', {
      emailOrUsername,
      password,
    });
    return response.data;
  },

  // Récupérer le profil
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════
// GESTION DES PARTIES
// ═══════════════════════════════════════════════════════

export const gameAPI = {
  // Créer une partie (ADMIN uniquement)
  createGame: async (name, description, coverImage, customStyles) => {
    const response = await api.post('/game', {
      name,
      description,
      coverImage,
      customStyles,
    });
    return response.data;
  },

  // Récupérer les parties créées par le MJ
  getMyGames: async () => {
    const response = await api.get('/game/my-games');
    return response.data;
  },

  // Récupérer les parties où le joueur est invité
  getJoinedGames: async () => {
    const response = await api.get('/game/joined');
    return response.data;
  },

  // Récupérer une partie par son ID
  getGameById: async (gameId) => {
    const response = await api.get(`/game/${gameId}`);
    return response.data;
  },

  // Mettre à jour une partie
  updateGame: async (gameId, data) => {
    const response = await api.put(`/game/${gameId}`, data);
    return response.data;
  },

  // Supprimer une partie
  deleteGame: async (gameId) => {
    const response = await api.delete(`/game/${gameId}`);
    return response.data;
  },

  // Inviter un joueur
  invitePlayer: async (gameId, playerId) => {
    const response = await api.post(`/game/${gameId}/invite`, { playerId });
    return response.data;
  },

  // Retirer un joueur
  removePlayer: async (gameId, playerId) => {
    const response = await api.delete(`/game/${gameId}/player/${playerId}`);
    return response.data;
  },
}; // ← AJOUT DU }; QUI MANQUAIT

// ═══════════════════════════════════════════════════════
// CUSTOM MODEL API (Templates de personnages)
// ═══════════════════════════════════════════════════════

export const customModelAPI = {
  // Créer un template
  async create(data) {
    const response = await api.post('/custom-model', data);
    return response.data;
  },

  // Récupérer tous les templates d'une partie
  async getByGame(gameId) {
    const response = await api.get(`/custom-model/game/${gameId}`);
    return response.data;
  },

  // Récupérer un template par ID
  async getById(modelId) {
    const response = await api.get(`/custom-model/${modelId}`);
    return response.data;
  },

  // Obtenir un schéma par défaut
  async getDefaultSchema() {
    const response = await api.get('/custom-model/default/schema');
    return response.data;
  },

  // Modifier un template
  async update(modelId, data) {
    const response = await api.put(`/custom-model/${modelId}`, data);
    return response.data;
  },

  // Supprimer un template
  async delete(modelId) {
    const response = await api.delete(`/custom-model/${modelId}`);
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════
// CHARACTER API (Personnages)
// ═══════════════════════════════════════════════════════

export const characterAPI = {
  // Créer un personnage
  async create(data) {
    const response = await api.post('/character', data);
    return response.data;
  },

  // Récupérer tous les personnages d'une partie
  async getByGame(gameId) {
    const response = await api.get(`/character/game/${gameId}`);
    return response.data;
  },

  // Récupérer un personnage par ID
  async getById(characterId) {
    const response = await api.get(`/character/${characterId}`);
    return response.data;
  },

  // Modifier un personnage
  async update(characterId, data) {
    const response = await api.put(`/character/${characterId}`, data);
    return response.data;
  },

  // Supprimer un personnage
  async delete(characterId) {
    const response = await api.delete(`/character/${characterId}`);
    return response.data;
  },
};

// ═══════════════════════════════════════════════════════
// ASSET API (Fichiers)
// ═══════════════════════════════════════════════════════

export const assetAPI = {
  // Upload un fichier (utilise FormData)
  async upload(gameId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/asset/upload/${gameId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Récupérer tous les assets d'une partie
  async getByGame(gameId) {
    const response = await api.get(`/asset/game/${gameId}`);
    return response.data;
  },

  // Récupérer un asset par ID
  async getById(assetId) {
    const response = await api.get(`/asset/${assetId}`);
    return response.data;
  },

  // Supprimer un asset
  async delete(assetId) {
    const response = await api.delete(`/asset/${assetId}`);
    return response.data;
  },
};

// Export par défaut pour usage général
export default api;