// 📍 Fichier : frontend/src/lib/AnimationLibrary.js
// 🎯 Rôle : Bibliothèque d'animations prédéfinies
// 💡 Catalogue d'effets visuels pour le plateau de jeu

export const ANIMATION_LIBRARY = {
  explosion: {
    name: '💥 Explosion',
    category: 'combat',
    duration: 2000,
    effect: 'explosion',
    description: 'Grande explosion avec particules',
  },
  
  fireball: {
    name: '🔥 Boule de Feu',
    category: 'magic',
    duration: 3000,
    effect: 'fireball',
    description: 'Boule de feu qui traverse l\'écran',
  },
  
  heal: {
    name: '✨ Soin',
    category: 'magic',
    duration: 2000,
    effect: 'heal',
    description: 'Particules de soin dorées',
  },
  
  lightning: {
    name: '⚡ Éclair',
    category: 'magic',
    duration: 1500,
    effect: 'lightning',
    description: 'Éclair qui frappe',
  },
  
  shield: {
    name: '🛡️ Bouclier',
    category: 'defense',
    duration: 2500,
    effect: 'shield',
    description: 'Bouclier protecteur qui apparaît',
  },
  
  poison: {
    name: '☠️ Poison',
    category: 'debuff',
    duration: 3000,
    effect: 'poison',
    description: 'Nuage toxique vert',
  },
  
  freeze: {
    name: '❄️ Gel',
    category: 'debuff',
    duration: 2000,
    effect: 'freeze',
    description: 'Vague de glace',
  },
  
  buff: {
    name: '💪 Buff',
    category: 'buff',
    duration: 2000,
    effect: 'buff',
    description: 'Aura de puissance',
  },
  
  critical: {
    name: '⚔️ Coup Critique',
    category: 'combat',
    duration: 1500,
    effect: 'critical',
    description: 'Impact critique avec flash',
  },
  
  teleport: {
    name: '🌀 Téléportation',
    category: 'magic',
    duration: 2000,
    effect: 'teleport',
    description: 'Spirale de téléportation',
  },
  
  smoke: {
    name: '💨 Fumée',
    category: 'utility',
    duration: 3000,
    effect: 'smoke',
    description: 'Nuage de fumée',
  },
  
  sparkles: {
    name: '✨ Étincelles',
    category: 'utility',
    duration: 2500,
    effect: 'sparkles',
    description: 'Pluie d\'étincelles magiques',
  },
};

export const ANIMATION_CATEGORIES = {
  all: '🎭 Toutes',
  combat: '⚔️ Combat',
  magic: '🔮 Magie',
  defense: '🛡️ Défense',
  buff: '💪 Buffs',
  debuff: '☠️ Debuffs',
  utility: '🔧 Utilitaires',
};

export const POSITION_PRESETS = {
  center: { x: 50, y: 50, label: 'Centre' },
  top: { x: 50, y: 20, label: 'Haut' },
  bottom: { x: 50, y: 80, label: 'Bas' },
  left: { x: 20, y: 50, label: 'Gauche' },
  right: { x: 80, y: 50, label: 'Droite' },
  topLeft: { x: 20, y: 20, label: 'Haut Gauche' },
  topRight: { x: 80, y: 20, label: 'Haut Droite' },
  bottomLeft: { x: 20, y: 80, label: 'Bas Gauche' },
  bottomRight: { x: 80, y: 80, label: 'Bas Droite' },
};
