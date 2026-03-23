# STORM — Roadmap Front-End

> Fichier de suivi des fonctionnalités à implémenter.
> Mettre à jour ce fichier à chaque session de travail.

---

## Légende
- [ ] À faire
- [~] En cours
- [x] Terminé

---

## 1. Infrastructure & Backend connexion

- [x] Connecter les conversations au vrai backend (GET /conversations)
- [x] Connecter les messages au vrai backend (GET /conversations/:id/messages)
- [x] Envoyer les messages via API (POST /conversations/:id/messages)
- [x] Créer une conversation via API (POST /conversations)
- [x] WebSocket pour les messages en temps réel

---

## 2. Médias

- [ ] Envoyer des images/fichiers dans le composeur (ChatComposer)
- [ ] Afficher les images dans les bulles de message (MessageBubble)
- [ ] Onglet / panneau "Médias partagés" dans le rail droit ou un panel dédié
- [ ] Prévisualisation des images (lightbox)
- [ ] Support des fichiers (PDF, etc.) avec téléchargement

---

## 3. Gestion des contacts & groupes

- [ ] Modifier le nom d'un contact (renommer une conversation 1-on-1)
- [ ] Modifier le nom d'un groupe
- [ ] Changer l'avatar d'un groupe
- [ ] Ajouter des membres à un groupe existant
- [ ] Supprimer un membre d'un groupe (si admin)
- [ ] Bloquer un contact / membre
- [x] Quitter un groupe
- [x] Voir les informations d'un groupe (panel latéral)

---

## 4. Interface utilisateur

- [x] Panel "Infos conversation" (slide-in depuis la droite) avec :
  - Nom + avatar du contact/groupe
  - Liste des membres cliquables
  - Bouton quitter le groupe
- [ ] Barre de recherche dans les messages d'une conversation
- [x] Marqueur de messages lus/non-lus
- [x] Indicateur "en train d'écrire..."
- [x] Notifications (badge favicon / notification navigateur)

---

## 5. Profil utilisateur

- [ ] Page / modal profil (modifier display_name, avatar)
- [ ] Upload d'avatar

---

## Session actuelle — Ce qui a été fait

### 2026-03-19
- [x] Installation des dépendances (pnpm install)
- [x] Exploration complète du code existant
- [x] Création de ce fichier ROADMAP.md
- [x] Connexion entre le front et le back (proxy Vite → backend local)

### 2026-03-22
- [x] Lancement infra locale (docker-compose : postgres, nats, redis)
- [x] Lancement gateway (Go :8080), message-service (Go :8081), user-service (NestJS :3000)
- [x] Auth complète : register / login / logout / refresh
- [x] Chat store branché sur le vrai backend (conversations + messages + send + create)
- [x] WebSocket temps réel : connexion JWT, join rooms, réception messages, typing indicator, auto-scroll
- [x] Active highlighting conversations + badges non-lus
- [x] Notifications navigateur (Web Notification API)
- [x] Panel infos conversation (membres, rôles, quitter)
