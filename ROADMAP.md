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
- [ ] Pagination des messages (next_cursor déjà retourné par l'API, non utilisé)
- [ ] Scroll infini — charger les messages plus anciens au scroll vers le haut
- [ ] Fix : les messages reçus via WebSocket ne contiennent pas l'attachment (useChatWorkspace.ts:37)
- [ ] Détection de doublons : ne pas créer une nouvelle conversation 1-on-1 si elle existe déjà
- [ ] Optimistic update — afficher le message immédiatement avant confirmation API
- [ ] Retry visible si l'envoi d'un message échoue

---

## 2. Médias

- [x] Envoyer des images/fichiers dans le composeur (ChatComposer)
- [x] Afficher les images dans les bulles de message (MessageBubble)
- [x] Onglet "Médias partagés" dans le panel infos conversation
- [x] Prévisualisation des images (lightbox)
- [x] Support des fichiers (PDF, etc.) avec téléchargement
- [ ] Multi-fichiers — envoyer plusieurs fichiers en une fois
- [ ] Drag & drop pour envoyer des fichiers dans le composeur
- [x] Changer l'avatar d'un groupe (clic sur l'avatar dans ConversationInfoPanel)
- [x] Upload d'avatar utilisateur (profil)

---

## 3. Gestion des contacts & groupes

- [x] Modifier le nom d'un contact (renommer une conversation 1-on-1)
- [x] Modifier le nom d'un groupe
- [x] Ajouter des membres à un groupe existant
- [x] Supprimer un membre d'un groupe (si admin)
- [x] Bloquer / débloquer un contact (stocké en localStorage, désactive le composeur)
- [x] Quitter un groupe
- [x] Voir les informations d'un groupe (panel latéral)
- [x] Détection automatique 1-on-1 vs groupe dans le panel infos
- [ ] Épingler une conversation en haut de la sidebar
- [ ] Archiver une conversation
- [ ] Muter les notifications d'une conversation
- [ ] Marquer une conversation comme non-lue manuellement

---

## 4. Messages — Actions

- [ ] Supprimer son propre message (DELETE /api/messages/{id} — API prête)
- [ ] Éditer son propre message (PUT /api/messages/{id} — API prête)
- [ ] Répondre à un message (reply avec citation)
- [ ] Copier le texte d'un message
- [ ] Menu contextuel sur un message (hover ou clic droit) : Répondre / Copier / Modifier / Supprimer
- [ ] Placeholder "Message supprimé" quand un message est effacé
- [ ] Double coche ✓✓ envoyé/lu (message_receipts existe en base, rien dans le front)
- [ ] Timestamp affiché au hover uniquement (actuellement toujours visible)

---

## 5. Composeur

- [ ] Emoji picker
- [ ] Raccourci Shift+Enter pour saut de ligne (Enter = envoyer)
- [ ] Répondre à un message depuis le composeur (reply)

---

## 6. Interface utilisateur

- [x] Panel "Infos conversation" (slide-in depuis la droite)
- [x] Onglets Membres / Médias dans le panel infos
- [x] Barre de recherche dans les messages d'une conversation
- [x] Marqueur de messages lus/non-lus
- [x] Indicateur "en train d'écrire..."
- [x] Notifications (badge favicon / notification navigateur)
- [ ] Bouton "Retour en bas" quand l'utilisateur scrolle vers le haut
- [ ] Bouton "Aller aux non-lus"
- [ ] Séparateurs de dates réels dans le thread (DateDivider actuellement hardcodé)
- [ ] Skeletons de chargement pour la liste de conversations
- [ ] Indicateur de statut WebSocket visible dans la sidebar (wsConnected exposé mais non affiché)
- [ ] Statut en ligne des contacts (DirectoryUser.status existe mais jamais alimenté)

---

## 7. Sidebar

- [ ] La bannière utilisateur connecté cliquable → ouvre le profil
- [ ] Trier les conversations (par date, non-lus en premier)
- [ ] Conversations archivées (section dédiée)

---

## 8. Profil utilisateur

- [x] Page / modal profil (modifier display_name, avatar)
- [x] Upload d'avatar utilisateur
- [x] Accès au profil depuis la bannière utilisateur dans la sidebar

---

## 9. Mobile & Responsive

- [ ] Bouton hamburger pour afficher/masquer la sidebar sur mobile (sidebar cachée avec hidden md:flex)
- [ ] Swipe gauche/droite pour ouvrir/fermer la sidebar sur mobile
- [ ] Layout adaptatif : thread plein écran sur mobile quand une conversation est active

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

### 2026-04-01
- [x] Onglet "Médias partagés" dans ConversationInfoPanel (galerie images + liste fichiers + lightbox navigable)
- [x] Détection automatique 1-on-1 vs groupe dans le panel infos
- [x] Onglets Membres / Médias dans le panel infos
- [x] Roadmap mise à jour avec toutes les fonctionnalités identifiées
- [x] Renommer une conversation 1-on-1 (même endpoint PATCH /api/groups/{id})
- [x] Changer l'avatar d'un groupe (upload MinIO + PATCH)
- [x] Bloquer / débloquer un contact (localStorage, bannière + désactivation composeur)
- [x] Recherche dans les messages (barre toggle, filtre local, compteur résultats)
- [x] Modal profil utilisateur (modifier display_name + upload avatar)
- [x] Bannière utilisateur cliquable dans la sidebar → ouvre le profil
- [x] useBlockStore (Pinia + localStorage)
