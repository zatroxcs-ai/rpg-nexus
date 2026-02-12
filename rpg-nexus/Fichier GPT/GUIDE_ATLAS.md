# 🗺️ GUIDE : SYSTÈME D'ATLAS - Maps + Scènes Multiples

## 📋 Vue d'Ensemble

- **Fond de map** : Charge une image PNG/JPG comme fond de plateau
- **Atlas** : Plusieurs scènes (maps) par partie
- **Changement de scène** : Le MJ passe d'une map à l'autre

---

## ⚙️ BACKEND (~10 min)

### Étape 1 : Mettre à jour schema.prisma

**DANS `backend/prisma/schema.prisma`** :

1. **Remplace** le modèle `TacticalMap` par :

```prisma
model TacticalMap {
  id            String     @id @default(uuid())
  gameId        String     @unique
  activeSceneId String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  game          Game       @relation(fields: [gameId], references: [id], onDelete: Cascade)
  scenes        MapScene[]
  @@index([gameId])
}

model MapScene {
  id                String      @id @default(uuid())
  tacticalMapId     String
  name              String      @default("Nouvelle Scène")
  order             Int         @default(0)
  gridSize          Int         @default(50)
  gridWidth         Int         @default(30)
  gridHeight        Int         @default(20)
  gridColor         String      @default("#444444")
  gridOpacity       Float       @default(0.5)
  backgroundColor   String      @default("#1a1a1a")
  backgroundImage   String?
  backgroundOpacity Float       @default(1.0)
  cellUnit          String      @default("5ft")
  tokens            Json        @default("[]")
  drawings          Json        @default("[]")
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  tacticalMap       TacticalMap @relation(fields: [tacticalMapId], references: [id], onDelete: Cascade)
  @@index([tacticalMapId])
}
```

### Étape 2 : Migration

```bash
cd backend
npx prisma migrate dev --name atlas-system
npx prisma generate
```

### Étape 3 : Remplacer les fichiers backend

**Remplace ces fichiers :**

- `backend/src/tactical-map/tactical-map.service.ts` ← `tactical-map-atlas.service.ts`
- `backend/src/tactical-map/tactical-map.controller.ts` ← `tactical-map-atlas.controller.ts`

*(Le module `tactical-map.module.ts` reste le même)*

---

## 🎨 FRONTEND (~5 min)

### Étape 1 : Remplacer TacticalMap.jsx

**Remplace** `frontend/src/components/TacticalMap.jsx` par le fichier `TacticalMap-atlas.jsx`

*(TokenCreator.jsx et MapBackgroundSelector.jsx restent les mêmes)*

---

## ✅ Vérification

### Backend
```bash
cd backend
npm run start:dev
```

Tu dois voir :
```
Mapped {/api/tactical-map/:gameId/atlas, GET}
Mapped {/api/tactical-map/:gameId/scene, POST}
Mapped {/api/tactical-map/:gameId/switch/:sceneId, PUT}
```

### Frontend
```bash
cd frontend
npm run dev
```

---

## 🎮 Utilisation

### Pour le MJ

**Gérer les scènes (Atlas) :**
1. Le panneau Atlas est visible à gauche du plateau
2. Clique sur une scène pour la visualiser
3. Clique sur **"▶ Scène"** dans l'atlas pour la rendre active (tout le monde voit la même)
4. **＋ Nouvelle Scène** : Crée une nouvelle scène
5. **✏️** : Renommer une scène
6. **🗑️** : Supprimer une scène (garde au moins 1)

**Ajouter un fond de map :**
1. Upload ton image dans l'onglet **📦 Fichiers**
2. Va dans **🗺️ Plateau**
3. Clique sur **🖼️ Fond** dans la barre d'outils
4. Sélectionne ton image
5. Clique **✅ Appliquer**

**Changer de scène pour tout le monde :**
- Clique sur la scène dans l'atlas → Tous les joueurs voient la nouvelle scène

### Pour les Joueurs

- Voient automatiquement la scène active choisie par le MJ
- Peuvent zoomer/dézoomer avec les boutons ou la molette
- Peuvent déplacer leur vue (Ctrl+Clic + glisser)

---

## ✨ Fonctionnalités

### 🗺️ Atlas
- **Scènes multiples** par partie (illimité)
- **Changement en temps réel** (tout le monde voit la même scène)
- **Renommer, créer, supprimer** les scènes
- **Tokens et dessins** séparés par scène
- **Toggle** du panneau atlas (bouton ◀/▶)

### 🖼️ Fond de Map
- **PNG, JPG, WebP** supportés
- **Depuis l'Asset Manager** (images déjà uploadées)
- **Transparence configurable** (grille toujours visible)
- **Par scène** : Chaque scène a son propre fond

### 🔍 Zoom / Pan
- **50% à 300%** de zoom
- **Molette** pour zoomer
- **Ctrl+Clic** pour déplacer la vue
- **Bouton ↻** pour réinitialiser
- **Local** : Chaque joueur zoom pour lui

---

## ⚠️ Notes Importantes

- Les **tokens** et **dessins** sont séparés par scène
- Quand le MJ change de scène, **tous les joueurs** voient la nouvelle scène
- Les **tokens** restent en place quand on revient sur une scène
- L'**image de fond** est partagée (tous voient la même)
- Le **zoom** est personnel (chaque joueur a le sien)

---

## 🎨 Conseils pour les Maps

**Formats recommandés :**
- PNG avec transparence pour les overlays
- JPG pour les grandes cartes (plus léger)
- Résolution : 1500×1000px minimum

**Sources de maps gratuites :**
- https://2minutetabletop.com/
- https://dungeonscrawl.com/
- Reddit : r/battlemaps

---

**Bon jeu ! 🗺️🎉**
