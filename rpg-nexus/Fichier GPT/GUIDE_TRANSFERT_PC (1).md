# 📦 GUIDE : TRANSFERT SUR UN NOUVEL ORDINATEUR

## 🎯 Vue d'Ensemble

Tu dois sauvegarder :
1. **Le code** (frontend + backend)
2. **La base de données PostgreSQL** (toutes tes données)
3. **Les fichiers uploadés** (images, assets)
4. **Les variables d'environnement** (.env)

---

## 📋 ÉTAPE 1 : SAUVEGARDER SUR L'ANCIEN PC

### 1.1 Copier le Projet

**Option A : Avec Git (RECOMMANDÉ)**

Si tu utilises Git :
```bash
# Commit tous tes changements
git add .
git commit -m "Sauvegarde avant transfert"
git push origin main
```

**Option B : Sans Git**

Copie tout le dossier `rpg-nexus` sur une clé USB ou cloud :
- Le dossier `backend/`
- Le dossier `frontend/`
- Tous les fichiers (sauf `node_modules/` - on les réinstallera)

### 1.2 Sauvegarder la Base de Données

**TRÈS IMPORTANT : Exporte ta BDD PostgreSQL**

```bash
# Ouvre un terminal et exécute :
pg_dump -U postgres -d rpg_nexus > rpg_nexus_backup.sql
```

**Si tu as un mot de passe, il te le demandera.**

Cela crée un fichier `rpg_nexus_backup.sql` qui contient :
- ✅ Tous tes utilisateurs
- ✅ Toutes tes parties
- ✅ Tous tes personnages
- ✅ Tous tes templates
- ✅ Tout !

**Sauvegarde ce fichier sur USB/cloud !**

### 1.3 Sauvegarder les Fichiers Uploadés

Copie le dossier contenant les uploads :
```
backend/uploads/
```

**C'est là que sont stockées toutes les images uploadées !**

### 1.4 Sauvegarder les Variables d'Environnement

Copie le fichier :
```
backend/.env
```

Il contient :
- L'URL de connexion à PostgreSQL
- Le secret JWT
- Etc.

---

## 💻 ÉTAPE 2 : INSTALLER SUR LE NOUVEL PC

### 2.1 Installer les Logiciels Requis

**1. Node.js (v18 ou plus récent)**
- Télécharge depuis : https://nodejs.org/
- Installe avec toutes les options par défaut

**2. PostgreSQL (v14 ou plus récent)**
- Télécharge depuis : https://www.postgresql.org/download/
- Pendant l'installation :
  - Note le mot de passe que tu définis
  - Port : 5432 (par défaut)
  - Lance pgAdmin 4 avec

**3. Git (optionnel mais recommandé)**
- Télécharge depuis : https://git-scm.com/

### 2.2 Récupérer le Code

**Option A : Avec Git**
```bash
git clone <ton-repo-url>
cd rpg-nexus
```

**Option B : Sans Git**
- Copie le dossier `rpg-nexus` depuis la clé USB/cloud
- Place-le où tu veux (ex: `C:\projets\rpg-nexus`)

---

## 🗄️ ÉTAPE 3 : RESTAURER LA BASE DE DONNÉES

### 3.1 Créer la Base de Données

Ouvre **pgAdmin 4** ou un terminal :

```sql
-- Dans pgAdmin ou psql :
CREATE DATABASE rpg_nexus;
```

### 3.2 Restaurer les Données

```bash
# Dans un terminal (remplace 'postgres' par ton user si différent) :
psql -U postgres -d rpg_nexus < rpg_nexus_backup.sql
```

**Entre ton mot de passe PostgreSQL quand demandé.**

✅ Toutes tes données sont maintenant restaurées !

---

## ⚙️ ÉTAPE 4 : CONFIGURER LE BACKEND

### 4.1 Copier .env

Place le fichier `.env` sauvegardé dans `backend/.env`

**OU crée-en un nouveau :**

```env
# backend/.env

# Database
DATABASE_URL="postgresql://postgres:TON_MOT_DE_PASSE@localhost:5432/rpg_nexus"

# JWT
JWT_SECRET="ton_secret_jwt_super_secure_ici"

# Server
PORT=3000
```

**Remplace `TON_MOT_DE_PASSE` par le mot de passe PostgreSQL du nouvel PC !**

### 4.2 Installer les Dépendances

```bash
cd backend
npm install
```

### 4.3 Restaurer les Fichiers Uploadés

Copie le dossier `uploads/` sauvegardé dans :
```
backend/uploads/
```

### 4.4 Générer Prisma

```bash
npx prisma generate
```

### 4.5 Tester le Backend

```bash
npm run start:dev
```

Tu devrais voir :
```
🚀 Serveur NestJS lancé sur http://localhost:3000
✅ Connecté à PostgreSQL via Prisma
```

---

## 🎨 ÉTAPE 5 : CONFIGURER LE FRONTEND

### 5.1 Installer les Dépendances

```bash
cd frontend
npm install
```

### 5.2 Vérifier la Configuration

Vérifie que `frontend/src/services/api.js` pointe bien vers `http://localhost:3000`

### 5.3 Tester le Frontend

```bash
npm run dev
```

Tu devrais voir :
```
Local:   http://localhost:5173/
```

---

## ✅ ÉTAPE 6 : VÉRIFICATION

### 6.1 Teste la Connexion

1. Ouvre http://localhost:5173
2. **Connecte-toi** avec ton compte
3. **Rejoins une partie**
4. **Vérifie que tout est là** :
   - ✅ Tes personnages
   - ✅ Tes parties
   - ✅ Tes images uploadées
   - ✅ Tes templates

### 6.2 Si Problème

**Problème : "Connection refused" PostgreSQL**
→ Vérifie que PostgreSQL est bien démarré
→ Vérifie le mot de passe dans `.env`

**Problème : "Cannot find module"**
→ Réinstalle les dépendances : `npm install`

**Problème : "Images ne s'affichent pas"**
→ Vérifie que le dossier `backend/uploads/` a bien été copié

---

## 📊 RÉCAPITULATIF : FICHIERS À SAUVEGARDER

### ✅ OBLIGATOIRES

1. **Code source** : Tout le dossier `rpg-nexus/` (sauf `node_modules/`)
2. **Base de données** : `rpg_nexus_backup.sql` (EXPORT PostgreSQL)
3. **Fichiers uploadés** : `backend/uploads/`
4. **Variables d'environnement** : `backend/.env`

### ⚠️ NE PAS COPIER

- ❌ `backend/node_modules/` (réinstallés avec `npm install`)
- ❌ `frontend/node_modules/` (réinstallés avec `npm install`)
- ❌ `backend/dist/` (recompilé automatiquement)
- ❌ `frontend/dist/` (recompilé automatiquement)

---

## 🎯 CHECKLIST RAPIDE

**Sur l'ANCIEN PC :**
- [ ] Copier le code source
- [ ] Exporter la BDD : `pg_dump -U postgres -d rpg_nexus > backup.sql`
- [ ] Copier `backend/uploads/`
- [ ] Copier `backend/.env`

**Sur le NOUVEL PC :**
- [ ] Installer Node.js
- [ ] Installer PostgreSQL
- [ ] Créer la BDD : `CREATE DATABASE rpg_nexus;`
- [ ] Restaurer la BDD : `psql -U postgres -d rpg_nexus < backup.sql`
- [ ] Copier le code
- [ ] Adapter `backend/.env` (nouveau mot de passe PostgreSQL)
- [ ] `cd backend && npm install`
- [ ] Copier `backend/uploads/`
- [ ] `npx prisma generate`
- [ ] `cd frontend && npm install`
- [ ] Tester !

---

## 💡 CONSEILS

### Option Cloud (Alternative)

Au lieu d'une clé USB, tu peux :
- Mettre le code sur **GitHub** (gratuit)
- Mettre le backup SQL sur **Google Drive** / **Dropbox**
- Mettre les uploads sur **Google Drive** / **Dropbox**

### Sauvegarde Régulière

Configure une sauvegarde automatique :
```bash
# Script Windows (backup_db.bat)
pg_dump -U postgres -d rpg_nexus > rpg_nexus_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql
```

Lance-le régulièrement pour sauvegarder ta BDD !

---

## 🆘 BESOIN D'AIDE ?

Si tu as un problème pendant le transfert :
1. Note l'erreur exacte
2. Vérifie que PostgreSQL tourne
3. Vérifie les logs backend/frontend

---

## ✨ C'est Prêt !

Après ces étapes, ton application sera **100% opérationnelle** sur le nouvel ordinateur avec **toutes tes données** ! 🎉
