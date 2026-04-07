# STORM Day — Front (Vue 3 + Vite)

Application chat : **REST** via le **gateway** (même origine en dev grâce au proxy Vite) et **WebSocket** pour le temps réel.

---

## Prérequis & commandes

```sh
pnpm install
pnpm dev          # http://localhost:5173 — proxy /api, /auth, /ws → gateway
pnpm build
pnpm test:unit
```

**IDE :** [VS Code](https://code.visualstudio.com/) + extension [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

**Typecheck :** `vue-tsc` (pas `tsc` seul sur les `.vue`).

---

## Intégration API & WebSocket

### Proxy (Vite)

Le front ne définit pas d’URL absolue : `fetch('/api/...')` et `ws(s)://<host>/ws` passent par le proxy (`vite.config.ts`), typiquement vers le gateway (`localhost:30080` ou `8080`).

- **`/api`**, **`/auth`**, **`/users`** → HTTP gateway  
- **`/ws`** → WebSocket gateway (`ws: true`, `changeOrigin`)

### Déploiement (ex: Vercel)

En production, le proxy Vite n’existe pas. Configure les variables d’environnement:

- `VITE_API_BASE_URL=http://20.19.103.52:8080`
- `VITE_WS_BASE_URL=ws://20.19.103.52:8080` (optionnel, sinon dérivé de `VITE_API_BASE_URL`)

Sans ces variables, le front tente l’origine Vercel (`https://...vercel.app`) pour `/auth`, `/api`, `/users`, `/ws`, ce qui casse la connexion au backend.

### Authentification

- **REST :** header `Authorization: Bearer <access_token>` (+ `user_id` en query / `X-User-ID` selon `src/services/api.ts`).
- **WebSocket :** token en query `?token=<jwt>` (`src/services/ws.ts`).

### Endpoints REST utilisés (gateway)

| Méthode & chemin | Usage front |
|------------------|-------------|
| `GET /api/groups` | Liste des conversations (`fetchConversations`) |
| `GET /api/groups/:id/members` | Membres + cache des noms (`fetchMembers`) |
| `POST /api/groups` | Création de groupe (`createConversation`) |
| `POST /api/groups/:id/members` | Ajout de membre |
| `GET /api/messages?conversation_id=` | Historique du fil (`fetchMessages`) |
| `POST /api/messages` | Envoi : `conversation_id`, `content`, optionnel `reply_to_id`, `forward_from_id` |
| `PATCH /api/messages/:id` | Édition (`editMessage`) |
| Recherche users | Création de conv. (flux membre) |

Les DTOs peuvent être **snake_case** ou **camelCase** : le store normalise (`src/stores/chat.ts`).

### WebSocket — `action` gérées côté front

| `action` | Comportement |
|----------|----------------|
| `message` | Nouveau message (hors messages « own », déjà optimistes) |
| `typing` | Indicateur de frappe |
| `delivered` / `seen` | Statut message + `seenBy` |
| `message_updated` (+ alias) | Texte édité, flag `(edited)` |
| `conversation_created` / `group_created` | Sidebar + `join` room |

**Room :** `conversation:<id>` (alias `group:<id>` accepté).

**Filet de cohérence :** après un `message` WS entrant, un **GET silencieux** des messages est planifié (debounce ~350 ms) pour récupérer notamment `reply_to` complet si le WS est partiel.

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/services/api.ts` | `fetch` JSON + refresh 401 |
| `src/services/ws.ts` | Connexion, ping, handlers |
| `src/stores/chat.ts` | État conversations / messages / WS |
| `src/stores/auth.ts` | Session, tokens |
| `src/views/ChatView.vue` | Shell chat, forward modal |
| `src/components/organisms/ChatThread.vue` | Fil + composer |

### Environnement backend local (référence)

Pour faire tourner gateway + message-service + DB, voir la doc du **monorepo backend** (Docker, `make dev-setup-docker`, migrations **006** reply/forward, etc.). Sans stack alignée (proto NATS, migrations), certains champs (`reply_to`, `forward_from_id`) peuvent manquer : comportement attendu.

---

## Optimisations (état actuel)

- **Resync messages** : debounce 350 ms par conversation (évite rafales de GET).
- **Resync liste conversations** : debounce après `conversation_created`.
- **Logs** : `console.debug` dans `api.ts` / `ws.ts` / `chat.ts` — **uniquement en dev** pour `api.ts` ; le store WS reste verbeux en debug (à réduire si besoin).
- **Non fait** : pagination de l’historique, code-splitting agressif des vues (chunk principal volumineux — warning Vite en build).

---

## Backlog produit & trous d’implémentation front

Ces points sont aussi marqués **`TODO`** dans le code quand c’est pertinent.

| Zone | Statut |
|------|--------|
| **Pagination `GET /api/messages`** | Non implémenté — charge tout l’historique. |
| **Transfert** | UI + `forward_from_id` ; mention « Transféré » + `isForwarded` si API partielle. Pièces jointes / médias non gérés. |
| **Pièces jointes** | Bouton « + » du composer sans upload. |
| **Erreurs WS** (`JOIN_DENIED`, `action: error`) | Pas de toast UX — seulement logs. |
| **Forward / erreurs** | `window.alert` — à remplacer par toasts (Nuxt UI / composable). |
| **Add member** | Flux partiel (création groupe + recherche selon écrans). |
| **Recherche messages / conv** | Pas d’endpoint branché côté UI. |
| **Soft delete messages** | Non géré. |

**Backend / contrat** (gateway & message-service) : persistance `forward_from`, `forward_from` sur GET, WS enrichi, accusés persistés, noms sur `conversation_created`, etc. — suivi côté équipe infra ; le front s’adapte aux JSON décrits ci-dessus.

---

## Ancienne doc

Le fichier `docs/Plan-intégration.md` contenait le détail historique (dépannage k8s, payloads JSON longs, checklist gateway). Il **pointe maintenant vers ce README** ; pour les checklists détaillées du **repo gateway**, voir les chemins indiqués dans l’ancienne version si besoin (`WS-CONTRACT-VERIFICATION.md`, etc.).

---

## Licence / template

Base : template Vue 3 + Vite. Configuration : [Vite config reference](https://vite.dev/config/).
