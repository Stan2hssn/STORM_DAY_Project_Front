import { api } from '@/services/api';
import * as ws from '@/services/ws';
import { useAuthStore } from '@/stores/auth';
import type {
  ChatUser,
  Conversation,
  CreateGroupPayload,
  ForwardFrom,
  GroupDto,
  Message,
  MessageDto,
  ReplyTo,
  SeenByUser,
  SendMessageResult,
} from '@/types/chat';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(isoOrUnix: string | number): string {
  const date = typeof isoOrUnix === 'number'
    ? new Date(isoOrUnix * 1000)
    : new Date(isoOrUnix);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

/** Always returns HH:MM — used for message bubbles (DateDivider handles day changes) */
function formatMessageTime(isoOrUnix: string | number): string {
  const date = typeof isoOrUnix === 'number'
    ? new Date(isoOrUnix * 1000)
    : new Date(isoOrUnix);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Normalizes any date value (ISO, Postgres timestamp, Unix) to a valid ISO string */
function toISOString(raw: string | number): string {
  if (!raw) return new Date().toISOString();
  const date = typeof raw === 'number' ? new Date(raw * 1000) : new Date(String(raw).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function truncate(text: string, max = 42): string {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function mapConversation(dto: GroupDto): Conversation {
  return {
    id: String(dto.id),
    name: dto.name || '',
    preview: dto.last_message ? truncate(dto.last_message.content) : '',
    time: dto.last_message?.created_at
      ? formatTime(dto.last_message.created_at)
      : formatTime(dto.created_at),
    unread: dto.unread_count ?? 0,
  };
}

/** Members endpoint returns { user_id, role, created_at } — no display info */
function mapMember(raw: Record<string, unknown>): ChatUser {
  const rawId = raw.user_id ?? raw.id ?? '';
  const userId = (typeof rawId === 'string' || typeof rawId === 'number') ? String(rawId) : '';
  const username = (raw.username ?? raw.user_name ?? '') as string;
  const displayName = (raw.display_name ?? raw.displayName ?? raw.name ?? username ?? '') as string;
  const avatarUrl = (raw.avatar_url ?? raw.avatarUrl ?? undefined) as string | undefined;
  return { id: userId, username, displayName, avatarUrl };
}

function extractSenderName(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.sender_name === 'string') return raw.sender_name;
  if (typeof raw.senderName === 'string') return raw.senderName;
  if (typeof raw.username === 'string') return raw.username;

  const sender = raw.sender as Record<string, unknown> | undefined;
  if (sender) {
    return (sender.display_name ?? sender.displayName ?? sender.name ?? sender.username) as string | undefined;
  }
  return undefined;
}

/** Nested reply payload from API / WS (several possible keys). */
function pickReplyNested(dto: Record<string, unknown>): Record<string, unknown> | undefined {
  const v =
    dto.reply_to
    ?? dto.replyTo
    ?? dto.replied_message
    ?? dto.repliedMessage
    ?? dto.parent_message
    ?? dto.parentMessage
    ?? dto.parent;
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return undefined;
}

function replyToFromNested(nested: Record<string, unknown>): ReplyTo | undefined {
  const idRaw = nested.id ?? nested.message_id ?? nested.messageId;
  if (idRaw == null || idRaw === '') return undefined;
  const id = String(idRaw);
  const text = String(nested.content ?? nested.text ?? nested.body ?? '');
  const author = String(
    nested.sender_name
    ?? nested.senderName
    ?? nested.author
    ?? nested.sender_display_name
    ?? nested.display_name
    ?? nested.username
    ?? '',
  );
  return { id, author: author || 'Unknown', text };
}

/** Nested forward payload from API / WS. */
function pickForwardNested(dto: Record<string, unknown>): Record<string, unknown> | undefined {
  const v =
    dto.forward_from
    ?? dto.forwardFrom
    ?? dto.forwarded_message
    ?? dto.forwardedMessage
    ?? dto.original_message
    ?? dto.originalMessage
    ?? dto.source_message
    ?? dto.sourceMessage;
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return undefined;
}

function forwardFromFromNested(nested: Record<string, unknown>): ForwardFrom | undefined {
  return replyToFromNested(nested) as ForwardFrom | undefined;
}

/**
 * When API only gives `reply_to_id` or nested reply lacks text, fill from the parent message in the same thread.
 */
function enrichReplyPreviews(messages: Message[]): Message[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  return messages.map((m) => {
    if (!m.replyTo) return m;
    const parent = byId.get(m.replyTo.id);
    if (!parent) {
      return {
        ...m,
        replyTo: {
          id: m.replyTo.id,
          author: m.replyTo.author || 'Unknown',
          text: m.replyTo.text || 'Original message',
        },
      };
    }
    return {
      ...m,
      replyTo: {
        id: m.replyTo.id,
        author: m.replyTo.author || parent.author,
        text: m.replyTo.text || parent.text,
      },
    };
  });
}

function enrichForwardPreviews(messages: Message[]): Message[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  return messages.map((m) => {
    if (!m.forwardFrom) return m;
    const parent = byId.get(m.forwardFrom.id);
    if (!parent) {
      return {
        ...m,
        forwardFrom: {
          id: m.forwardFrom.id,
          author: m.forwardFrom.author || 'Unknown',
          text: m.forwardFrom.text || 'Message d’origine',
        },
      };
    }
    return {
      ...m,
      forwardFrom: {
        id: m.forwardFrom.id,
        author: m.forwardFrom.author || parent.author,
        text: m.forwardFrom.text || parent.text,
      },
    };
  });
}

function enrichQuotePreviews(messages: Message[]): Message[] {
  return enrichForwardPreviews(enrichReplyPreviews(messages));
}

/** Reply quote for a live WS message (nested object and/or reply_to_id + optional preview fields). */
function buildReplyToFromWsAndThread(raw: Record<string, unknown>, thread: Message[]): ReplyTo | undefined {
  const nested = pickReplyNested(raw);
  if (nested) {
    const r = replyToFromNested(nested);
    if (r) {
      const parent = thread.find((x) => String(x.id) === String(r.id));
      return {
        id: r.id,
        author: (r.author && r.author !== 'Unknown') ? r.author : (parent?.author || 'Unknown'),
        text: r.text || parent?.text || 'Original message',
      };
    }
  }
  // reply_to_id, replyToId, or reply_to as number (id only)
  const rid =
    raw.reply_to_id
    ?? raw.replyToId
    ?? raw.ReplyToID
    ?? raw.replyToID
    ?? raw.parent_id
    ?? raw.parentId
    ?? (typeof raw.reply_to === 'number' || (typeof raw.reply_to === 'string' && raw.reply_to !== '')
      ? raw.reply_to
      : undefined);
  if (rid == null || rid === '') return undefined;
  const sid = String(rid);
  const parent = thread.find((x) => String(x.id) === String(sid));
  const quotedAuthor = String(raw.quoted_author ?? raw.reply_author ?? raw.reply_sender_name ?? '');
  const quotedText = String(raw.quoted_content ?? raw.reply_preview ?? raw.quote ?? raw.preview ?? raw.reply_content ?? '');
  return {
    id: sid,
    author: quotedAuthor || parent?.author || 'Unknown',
    text: quotedText || parent?.text || 'Original message',
  };
}

function buildForwardFromFromWsAndThread(raw: Record<string, unknown>, thread: Message[]): ForwardFrom | undefined {
  const nested = pickForwardNested(raw);
  if (nested) {
    const r = forwardFromFromNested(nested);
    if (r) {
      const parent = thread.find((x) => String(x.id) === String(r.id));
      return {
        id: r.id,
        author: (r.author && r.author !== 'Unknown') ? r.author : (parent?.author || 'Unknown'),
        text: r.text || parent?.text || 'Message d’origine',
      };
    }
  }
  const fid =
    raw.forward_from_id
    ?? raw.forwardFromId
    ?? raw.ForwardFromID
    ?? raw.forwardFromID
    ?? raw.original_message_id
    ?? raw.originalMessageId
    ?? (typeof raw.forward_from === 'number' || (typeof raw.forward_from === 'string' && raw.forward_from !== '')
      ? raw.forward_from
      : undefined);
  if (fid == null || fid === '') return undefined;
  const sid = String(fid);
  const parent = thread.find((x) => String(x.id) === String(sid));
  const origAuthor = String(raw.forwarded_author ?? raw.original_sender_name ?? raw.forward_from_author ?? '');
  const origText = String(
    raw.forwarded_content ?? raw.original_content ?? raw.forward_preview ?? raw.forwardPreview ?? '',
  );
  return {
    id: sid,
    author: origAuthor || parent?.author || 'Unknown',
    text: origText || parent?.text || 'Message d’origine',
  };
}

/** Flatten common gateway shapes so reply_to_id / nested reply are visible at one level. */
function mergeWsMessageRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...raw };
  const topLevelObjects = [
    raw.message,
    raw.data,
    raw.payload,
    raw.body,
    raw.result,
    raw.Message,
    raw.msg,
    raw.event,
    raw.new_message,
    raw.NewMessage,
  ];
  for (const v of topLevelObjects) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(merged, v as Record<string, unknown>);
    }
  }
  const pl = raw.payload;
  if (pl && typeof pl === 'object' && !Array.isArray(pl)) {
    const p = pl as Record<string, unknown>;
    const inner = p.message ?? p.Message ?? p.msg;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      Object.assign(merged, inner as Record<string, unknown>);
    }
  }
  const dat = raw.data;
  if (dat && typeof dat === 'object' && !Array.isArray(dat)) {
    const d = dat as Record<string, unknown>;
    const inner = d.message ?? d.Message ?? d.msg;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      Object.assign(merged, inner as Record<string, unknown>);
    }
  }
  return merged;
}

/** Flatten WS frames for conversation_created / group_created (name often nested). */
function mergeConversationWsRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...raw };
  const tops = [
    raw.data,
    raw.payload,
    raw.body,
    raw.group,
    raw.conversation,
    raw.Group,
  ];
  for (const v of tops) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(merged, v as Record<string, unknown>);
    }
  }
  return merged;
}

function extractWsConversationName(m: Record<string, unknown>): string {
  const keys = [
    'name',
    'group_name',
    'conversation_name',
    'title',
    'display_name',
    'groupName',
    'conversationName',
    'chat_name',
    'label',
    'subject',
  ];
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// ---------------------------------------------------------------------------
// Response unwrapping — backend wraps in { ok, data, error }
// ---------------------------------------------------------------------------

function unwrapData(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if ('data' in obj) return obj.data;
  }
  return raw;
}

function unwrapArray<T>(raw: unknown): T[] {
  const data = unwrapData(raw);
  if (Array.isArray(data)) return data as T[];
  console.warn('[chat] unexpected response shape, expected array:', raw);
  return [];
}

function unwrapObject<T>(raw: unknown): T {
  const data = unwrapData(raw);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as T;
  }
  // Fallback: raw itself might be the object
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if ('id' in obj) return obj as T;
  }
  return raw as T;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore();

  // -- state ----------------------------------------------------------------
  const conversations = ref<Conversation[]>([]);
  const messagesByConversation = ref<Record<string, Message[]>>({});
  const membersByConversation = ref<Record<string, ChatUser[]>>({});
  const activeConversationId = ref<string | null>(
    sessionStorage.getItem('activeConversationId'),
  );
  const loadingConversations = ref(false);
  const loadingMessages = ref(false);

  const typingUsers = ref<Record<string, string[]>>({});
  const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // Cache userId → displayName, populated from messages & members
  const userDisplayNames = new Map<string, string>();
  let unsubWs: (() => void) | null = null;
  let unsubWsOpen: (() => void) | null = null;
  const EDIT_WINDOW_MS = 2 * 60 * 1000;

  /**
   * Gateway often omits reply_to on WS; one debounced GET merges full messages (with reply_to) from REST.
   */
  const messageResyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let conversationsResyncTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSilentMessagesResync(conversationId: string) {
    if (!conversationId || conversationId.startsWith('demo-')) return;
    const prev = messageResyncTimers.get(conversationId);
    if (prev) clearTimeout(prev);
    messageResyncTimers.set(
      conversationId,
      setTimeout(() => {
        messageResyncTimers.delete(conversationId);
        void fetchMessages(conversationId, { silent: true });
      }, 350),
    );
  }

  function parseWsConversationId(room: string): string {
    if (room.startsWith('conversation:')) return room.replace('conversation:', '');
    if (room.startsWith('group:')) return room.replace('group:', '');
    return room;
  }

  function rejoinAllConversationRooms() {
    for (const c of conversations.value) {
      if (c.id.startsWith('demo-')) continue;
      joinConversationRoom(c.id);
    }
  }

  function messageIdEquals(a: string, b: string) {
    return String(a) === String(b);
  }

  /** Apply a message text update from WebSocket (all clients, no reload). */
  function applyRemoteMessageEdit(conversationId: string, messageId: string, newContent: string) {
    const messages = messagesByConversation.value[conversationId];
    if (!messages) return;
    const idx = messages.findIndex((m) => messageIdEquals(m.id, messageId));
    if (idx === -1) return;
    const next = messages.map((m, i) =>
      i === idx ? { ...m, text: newContent, modified: true } : m,
    );
    messagesByConversation.value[conversationId] = next;
    const last = next[next.length - 1];
    if (last && messageIdEquals(last.id, messageId)) {
      conversations.value = conversations.value.map((c) =>
        c.id === conversationId ? { ...c, preview: truncate(newContent) } : c,
      );
    }
  }

  // -- getters --------------------------------------------------------------
  const activeConversation = computed(() =>
    conversations.value.find((c) => c.id === activeConversationId.value) ?? null,
  );

  const activeMessages = computed(() =>
    activeConversationId.value
      ? (messagesByConversation.value[activeConversationId.value] ?? [])
      : [],
  );

  const activeMembers = computed(() =>
    activeConversationId.value
      ? (membersByConversation.value[activeConversationId.value] ?? [])
      : [],
  );

  const membersLabel = computed(() => {
    const count = activeMembers.value.length;
    return `${count} member${count !== 1 ? 's' : ''}`;
  });

  const memberAvatars = computed(() =>
    activeMembers.value
      .map((m) => (m.displayName || m.username || '??').slice(0, 2).toUpperCase())
      .slice(0, 12),
  );

  const activeTypingUsers = computed(() =>
    activeConversationId.value
      ? (typingUsers.value[activeConversationId.value] ?? [])
      : [],
  );

  // Backend resolves names dynamically (DM → other user, group → "bob, charlie")
  const activeConversationDisplayName = computed(() =>
    activeConversation.value?.name || 'New conversation',
  );

  const systemMessage = computed(() => {
    if (!activeConversation.value) return '';
    const isGroup = activeMembers.value.length > 2;
    return isGroup
      ? `Group — ${activeConversationDisplayName.value}`
      : `Private conversation with ${activeConversationDisplayName.value}`;
  });

  // -- WebSocket ------------------------------------------------------------

  function updateMessageStatus(conversationId: string, messageId: string, status: Message['status']) {
    const messages = messagesByConversation.value[conversationId];
    if (!messages) return;
    const idx = messages.findIndex((m) => messageIdEquals(m.id, messageId));
    if (idx === -1) return;
    messagesByConversation.value[conversationId] = messages.map((m, i) =>
      i === idx ? { ...m, status } : m,
    );
  }

  function addSeenBy(conversationId: string, messageId: string, user: SeenByUser) {
    const messages = messagesByConversation.value[conversationId];
    if (!messages) return;
    messagesByConversation.value[conversationId] = messages.map((m) => {
      if (!messageIdEquals(m.id, messageId)) return m;
      const existing = m.seenBy ?? [];
      if (existing.some((s) => s.id === user.id)) return m;
      return { ...m, seenBy: [...existing, user] };
    });
  }

  function handleWsMessage(msg: ws.WsMessage) {
    if (import.meta.env.DEV) {
      console.debug('[chat] WS event:', msg.action, '| room:', msg.room, '| user:', msg.user, '| content:', msg.content);
    }

    const raw = msg as unknown as Record<string, unknown>;

    // TODO(ws-ux): traiter `action === 'error'` / `code: JOIN_DENIED` — toast ou bannière (voir README backlog).

    // New conversation for other members — no full reload (backend must broadcast)
    if (msg.action === 'group_created' || msg.action === 'conversation_created') {
      const merged = mergeConversationWsRecord(raw);
      const idRaw = merged.group_id ?? merged.conversation_id ?? merged.id;
      if (idRaw == null || idRaw === '') return;
      const sid = String(idRaw);
      const createdName = extractWsConversationName(merged);
      const preview = String(
        merged.last_message_preview
        ?? merged.preview
        ?? merged.lastMessagePreview
        ?? '',
      );
      const fallbackName = createdName || 'New conversation';

      if (conversations.value.some((c) => c.id === sid)) {
        if (createdName) {
          conversations.value = conversations.value.map((c) =>
            c.id === sid ? { ...c, name: createdName } : c,
          );
        }
        scheduleSilentConversationsResync();
        return;
      }

      conversations.value = [
        ...conversations.value,
        {
          id: sid,
          name: fallbackName,
          preview: truncate(preview || ''),
          time: formatTime(new Date().toISOString()),
          unread: sid === activeConversationId.value ? 0 : 1,
        },
      ];
      joinConversationRoom(sid);
      scheduleSilentConversationsResync();
      return;
    }

    // Remote message edit — no reload (backend must broadcast after PATCH)
    const editActions = new Set(['message_updated', 'message_edited', 'message_edit', 'updated']);
    if (editActions.has(msg.action)) {
      const conversationId = parseWsConversationId(msg.room ?? '');
      if (!conversationId) return;
      const messageIdRaw = raw.message_id ?? raw.messageId;
      const messageId = messageIdRaw != null ? String(messageIdRaw) : '';
      const newContent = ((raw.content as string) || msg.content || '').trim();
      if (!messageId || !newContent) return;
      applyRemoteMessageEdit(conversationId, messageId, newContent);
      return;
    }

    // Handle typing indicator
    if (msg.action === 'typing') {
      const conversationId = parseWsConversationId(msg.room);
      const currentUserId = auth.user?.id ?? '';
      if (String(msg.user) === String(currentUserId)) return;
      const displayName = userDisplayNames.get(msg.user) || msg.username || msg.user;
      const current = typingUsers.value[conversationId] ?? [];
      if (!current.includes(displayName)) {
        typingUsers.value = { ...typingUsers.value, [conversationId]: [...current, displayName] };
      }
      // Clear after 3s of no typing
      const timerKey = `${conversationId}:${displayName}`;
      const existing = typingTimers.get(timerKey);
      if (existing) clearTimeout(existing);
      typingTimers.set(timerKey, setTimeout(() => {
        const list = typingUsers.value[conversationId] ?? [];
        typingUsers.value = { ...typingUsers.value, [conversationId]: list.filter((n) => n !== displayName) };
        typingTimers.delete(timerKey);
      }, 3000));
      return;
    }

    // Handle delivery receipts
    if (msg.action === 'delivered') {
      const conversationId = parseWsConversationId(msg.room);
      const messageIdRaw = raw.message_id ?? raw.messageId;
      const messageId = messageIdRaw != null ? String(messageIdRaw) : '';
      if (messageId) {
        updateMessageStatus(conversationId, messageId, 'delivered');
      }
      return;
    }

    // Handle seen receipts — add user to seenBy (group) + update status (DM). On n’ajoute jamais soi-même à seenBy.
    if (msg.action === 'seen') {
      const conversationId = parseWsConversationId(msg.room);
      const messageIdRaw = raw.message_id ?? raw.messageId;
      const messageId = messageIdRaw != null ? String(messageIdRaw) : '';
      if (messageId) {
        updateMessageStatus(conversationId, messageId, 'seen');
        const seenUserId = (raw.seen_user_id ?? raw.user) as string | undefined;
        const currentUserId = auth.user?.id ?? '';
        if (seenUserId && String(seenUserId) !== String(currentUserId)) {
          const seenDisplayName = (raw.seen_display_name ?? raw.username ?? raw.display_name ?? '') as string;
          addSeenBy(conversationId, messageId, { id: String(seenUserId), displayName: seenDisplayName || 'Unknown' });
        }
      }
      return;
    }

    if (msg.action !== 'message') {
      if (import.meta.env.DEV) console.debug('[chat] ignoring non-message action:', msg.action);
      return;
    }

    const mergedRaw = mergeWsMessageRecord(raw);

    const conversationId = parseWsConversationId(msg.room);
    const currentUserId = auth.user?.id ?? '';
    const isOwn = String(msg.user) === String(currentUserId);

    // Cache display name from message sender
    if (msg.user && msg.username) {
      userDisplayNames.set(msg.user, msg.username);
    }

    if (import.meta.env.DEV) {
      console.debug('[chat] conversationId:', conversationId, '| currentUserId:', currentUserId, '| isOwn:', isOwn);
    }

    // Don't duplicate own messages (already added optimistically in sendMessage)
    if (isOwn) {
      if (import.meta.env.DEV) console.debug('[chat] skipping own message');
      return;
    }

    const now = new Date().toISOString();
    const serverIdRaw = mergedRaw.message_id ?? mergedRaw.messageId ?? mergedRaw.id;
    const serverId =
      (typeof serverIdRaw === 'string' || typeof serverIdRaw === 'number') && String(serverIdRaw).length
        ? String(serverIdRaw)
        : '';
    const threadBefore = messagesByConversation.value[conversationId] ?? [];
    const replyToWs = buildReplyToFromWsAndThread(mergedRaw, threadBefore);
    const forwardFromWs = buildForwardFromFromWsAndThread(mergedRaw, threadBefore);
    const message: Message = {
      id: serverId || crypto.randomUUID(),
      author: msg.username || 'Unknown',
      authorUsername: msg.username,
      text: (mergedRaw.content as string) ?? msg.content,
      time: formatMessageTime(now),
      rawTime: now,
      side: 'left',
      replyTo: replyToWs,
      forwardFrom: forwardFromWs,
      isForwarded: Boolean(forwardFromWs),
    };

    const existing = messagesByConversation.value[conversationId] ?? [];
    const contentForPreview = (mergedRaw.content as string) ?? msg.content;
    if (serverId && existing.some((m) => messageIdEquals(m.id, serverId))) {
      messagesByConversation.value[conversationId] = existing.map((m) =>
        messageIdEquals(m.id, serverId)
          ? {
            ...m,
            text: contentForPreview,
            time: message.time,
            rawTime: now,
            replyTo: replyToWs ?? m.replyTo,
            forwardFrom: forwardFromWs ?? m.forwardFrom,
            isForwarded: Boolean(forwardFromWs ?? m.forwardFrom ?? m.isForwarded),
          }
          : m,
      );
    } else {
      const appended = [...existing, message];
      messagesByConversation.value[conversationId] = enrichQuotePreviews(appended);
    }

    scheduleSilentMessagesResync(conversationId);

    // Accusé de réception « livré » : on a reçu le message, on le signale à l’expéditeur
    if (serverId) {
      ws.send({
        action: 'delivered',
        room: `conversation:${conversationId}`,
        message_id: serverId,
      });
    }

    // Update conversation preview
    conversations.value = conversations.value.map((c) =>
      c.id === conversationId
        ? {
          ...c,
          preview: truncate(contentForPreview),
          time: message.time,
          unread: c.id === activeConversationId.value ? 0 : c.unread + 1,
        }
        : c,
    );
  }

  function joinConversationRoom(conversationId: string) {
    ws.joinRoom(`conversation:${conversationId}`);
  }

  function initWebSocket() {
    ws.connect();
    unsubWs = ws.onMessage(handleWsMessage);
    unsubWsOpen = ws.onConnectionOpen(() => {
      rejoinAllConversationRooms();
    });
  }

  function destroyWebSocket() {
    unsubWs?.();
    unsubWs = null;
    unsubWsOpen?.();
    unsubWsOpen = null;
    ws.disconnect();
  }

  // -- actions --------------------------------------------------------------

  async function fetchConversations() {
    loadingConversations.value = true;
    try {
      const raw = await api.get<unknown>('/api/groups');
      const dtos = unwrapArray<GroupDto>(raw);
      conversations.value = dtos.map(mapConversation);

      // Join WS rooms for all conversations
      for (const c of conversations.value) {
        joinConversationRoom(c.id);
      }

      // Restore saved conversation or pick the first one
      const saved = activeConversationId.value;
      const target = saved && conversations.value.some((c) => c.id === saved)
        ? saved
        : conversations.value[0]?.id;
      if (target) {
        await selectConversation(target);
      }

    } catch (err) {
      console.error('[chat] fetchConversations failed:', err);
    } finally {
      loadingConversations.value = false;
    }
  }

  /** Refresh sidebar from GET /api/groups without loading spinner or changing thread (unless selection invalid). */
  async function fetchConversationsSilent() {
    try {
      const raw = await api.get<unknown>('/api/groups');
      const dtos = unwrapArray<GroupDto>(raw);
      const incoming = dtos.map(mapConversation);
      const prevActive = activeConversationId.value;
      conversations.value = incoming;
      for (const c of conversations.value) {
        joinConversationRoom(c.id);
      }
      if (prevActive && !incoming.some((c) => c.id === prevActive)) {
        activeConversationId.value = null;
        sessionStorage.removeItem('activeConversationId');
      }
    } catch (err) {
      console.warn('[chat] fetchConversationsSilent failed:', err);
    }
  }

  function scheduleSilentConversationsResync() {
    if (conversationsResyncTimer) clearTimeout(conversationsResyncTimer);
    conversationsResyncTimer = setTimeout(() => {
      conversationsResyncTimer = null;
      void fetchConversationsSilent();
    }, 400);
  }

  async function fetchMembers(conversationId: string) {
    try {
      const raw = await api.get<unknown>(`/api/groups/${conversationId}/members`);
      const dtos = unwrapArray<Record<string, unknown>>(raw);
      const members = dtos.map(mapMember);
      membersByConversation.value[conversationId] = members;
      for (const m of members) {
        if (m.id && m.displayName) userDisplayNames.set(m.id, m.displayName);
      }
    } catch (err) {
      console.error('[chat] fetchMembers failed:', err);
    }
  }

  async function fetchMessages(conversationId: string, { silent = false } = {}) {
    if (!silent) loadingMessages.value = true;
    try {
      const currentUserId = auth.user?.id ?? '';

      // TODO(rest-pagination): curseur / before_id / limit quand le gateway les expose — éviter charger tout l’historique.
      const raw = await api.get<unknown>(
        `/api/messages?conversation_id=${conversationId}`,
      );
      const dtos = unwrapArray<Record<string, unknown>>(raw);

      dtos.sort((a, b) => {
        const ta = (a.created_at ?? a.createdAt ?? '') as string | number;
        const tb = (b.created_at ?? b.createdAt ?? '') as string | number;
        const da = typeof ta === 'number' ? ta : new Date(ta).getTime();
        const db = typeof tb === 'number' ? tb : new Date(tb).getTime();
        if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
        return 0;
      });

      const incoming = dtos.map((dto) => {
        const senderId = String(dto.sender_id ?? dto.senderId ?? '');
        const senderName = extractSenderName(dto) ?? 'Unknown';
        const content = (dto.content ?? dto.text ?? dto.body ?? '') as string;
        const createdAt = (dto.created_at ?? dto.createdAt ?? '') as string | number;

        const rawTime = toISOString(createdAt);

        const senderUsername = (dto.sender_username ?? dto.senderUsername ?? '') as string;

        const nested = pickReplyNested(dto);
        let replyTo = nested ? replyToFromNested(nested) : undefined;
        const ridOnly =
          dto.reply_to_id
          ?? dto.replyToId
          ?? dto.ReplyToID
          ?? dto.replyToID
          ?? dto.parent_id
          ?? dto.parentId;
        if (!replyTo && ridOnly != null && ridOnly !== '') {
          replyTo = { id: String(ridOnly), author: '', text: '' };
        }

        const fnested = pickForwardNested(dto);
        let forwardFrom = fnested ? forwardFromFromNested(fnested) : undefined;
        const fidOnly =
          dto.forward_from_id
          ?? dto.forwardFromId
          ?? dto.ForwardFromID
          ?? dto.forwardFromID
          ?? dto.original_message_id
          ?? dto.originalMessageId;
        if (!forwardFrom && fidOnly != null && fidOnly !== '') {
          forwardFrom = { id: String(fidOnly), author: '', text: '' };
        }

        const forwardFlagged = Boolean(
          dto.is_forwarded
          ?? dto.forwarded
          ?? dto.isForwarded
          ?? dto.was_forwarded
          ?? dto.wasForwarded,
        );
        const isForwarded = Boolean(forwardFrom || forwardFlagged);

        const updatedAt = dto.updated_at ?? dto.updatedAt;
        const createdAtStr = createdAt;
        const modifiedFromApi = Boolean(
          dto.is_edited
          ?? dto.edited
          ?? dto.was_edited
          ?? (updatedAt && createdAtStr && String(updatedAt) !== String(createdAtStr)),
        );

        return {
          id: (typeof dto.id === 'string' || typeof dto.id === 'number') ? String(dto.id) : crypto.randomUUID(),
          author: senderName,
          authorUsername: senderUsername || undefined,
          text: content,
          time: formatMessageTime(createdAt),
          rawTime,
          side: senderId === currentUserId ? 'right' as const : 'left' as const,
          replyTo,
          forwardFrom,
          isForwarded,
          modified: modifiedFromApi,
          status: senderId === currentUserId
            ? ((dto.status as string) as Message['status']) || 'sent'
            : undefined,
          seenBy: Array.isArray(dto.seen_by)
            ? (dto.seen_by as Record<string, unknown>[]).map((s) => {
              const rawId = s.user_id ?? s.id;
              const id = (typeof rawId === 'string' || typeof rawId === 'number') ? String(rawId) : '';
              const displayName = (s.display_name ?? s.displayName ?? s.username ?? '') as string;
              return { id, displayName };
            })
            : undefined,
        };
      });

      const incomingEnriched = enrichQuotePreviews(incoming);

      const current = messagesByConversation.value[conversationId] ?? [];
      if (
        current.length !== incomingEnriched.length
        || incomingEnriched.some((msg, i) =>
          msg.id !== current[i]?.id
          || msg.text !== current[i]?.text
          || msg.modified !== current[i]?.modified
          || msg.replyTo?.id !== current[i]?.replyTo?.id
          || msg.replyTo?.text !== current[i]?.replyTo?.text
          || msg.replyTo?.author !== current[i]?.replyTo?.author
          || msg.forwardFrom?.id !== current[i]?.forwardFrom?.id
          || msg.forwardFrom?.text !== current[i]?.forwardFrom?.text
          || msg.forwardFrom?.author !== current[i]?.forwardFrom?.author
          || msg.isForwarded !== current[i]?.isForwarded,
        )
      ) {
        messagesByConversation.value[conversationId] = incomingEnriched;
      }
    } catch (err) {
      if (!silent) console.error('[chat] fetchMessages failed:', err);
    } finally {
      if (!silent) loadingMessages.value = false;
    }
  }

  async function selectConversation(conversationId: string) {
    activeConversationId.value = conversationId;
    sessionStorage.setItem('activeConversationId', conversationId);
    conversations.value = conversations.value.map((c) =>
      c.id === conversationId ? { ...c, unread: 0 } : c,
    );
    // Skip API calls for demo conversations (data already loaded)
    if (conversationId.startsWith('demo-')) return;
    await fetchMembers(conversationId);
    await fetchMessages(conversationId);
    markSeen(conversationId);
  }

  /** Envoie « vu » pour le dernier message de la conversation (backend peut interpréter comme « lu jusqu’ici »). */
  function markSeen(conversationId: string) {
    const messages = messagesByConversation.value[conversationId] ?? [];
    const lastMessage = messages[messages.length - 1];
    const messageId = lastMessage?.id != null ? String(lastMessage.id) : undefined;
    const payload: Record<string, unknown> = {
      action: 'seen',
      room: `conversation:${conversationId}`,
    };
    if (messageId) {
      payload.message_id = messageId;
    }
    if (auth.user?.id) {
      payload.seen_user_id = auth.user.id;
    }
    if (auth.user?.display_name) {
      payload.seen_display_name = auth.user.display_name;
    }
    ws.send(payload);
  }

  let lastTypingEmit = 0;
  function emitTyping() {
    const conversationId = activeConversationId.value;
    if (!conversationId || conversationId.startsWith('demo-')) return;
    const now = Date.now();
    if (now - lastTypingEmit < 2000) return;
    lastTypingEmit = now;
    ws.send({
      action: 'typing',
      room: `conversation:${conversationId}`,
    });
  }

  async function createConversation(payload: CreateGroupPayload) {
    try {
      const raw = await api.post<unknown>('/api/groups', {
        name: payload.name || undefined,
        member_ids: payload.memberIds,
      });
      if (import.meta.env.DEV) console.debug('[chat] POST /api/groups →', raw);

      const dto = unwrapObject<GroupDto>(raw);
      const groupId = dto?.id;
      if (!groupId) {
        console.error('[chat] createConversation: no id in response', dto);
        return;
      }

      // Add members individually (backend may not handle member_ids in create)
      for (const userId of payload.memberIds) {
        try {
          await api.post<unknown>(`/api/groups/${groupId}/members`, { user_id: userId });
        } catch (err) {
          console.error(`[chat] add member ${userId} to group ${groupId} failed:`, err);
        }
      }

      // Join WS room
      joinConversationRoom(String(groupId));

      // Refetch conversations & select
      await fetchConversations();
      const found = conversations.value.find((c) => String(c.id) === String(groupId));
      if (found) {
        await selectConversation(found.id);
      }
    } catch (err) {
      console.error('[chat] createConversation failed:', err);
    }
  }

  type SendMessageOptions = {
    conversationId?: string
    forwardFromMessageId?: string
    /** Aperçu transfert (optimiste + secours si l’API ne renvoie pas l’objet nested). */
    forwardFromPreview?: ForwardFrom
  }

  function parseNumericId(id: string | undefined): number | undefined {
    if (id == null || id === '') return undefined;
    const n = Number(id);
    return Number.isFinite(n) && !Number.isNaN(n) ? n : undefined;
  }

  async function sendMessage(
    content: string,
    replyTo?: { id: string; author: string; text: string },
    options?: SendMessageOptions,
  ): Promise<SendMessageResult> {
    const cleaned = content.trim()
    const conversationId = options?.conversationId ?? activeConversationId.value
    if (!cleaned || !conversationId) {
      return { ok: false, error: 'Missing message text or conversation.' }
    }

    const tempId = crypto.randomUUID()
    const now = new Date().toISOString()
    const isFwdSend = Boolean(options?.forwardFromMessageId || options?.forwardFromPreview)
    const optimistic: Message = {
      id: tempId,
      author: auth.user?.display_name ?? 'You',
      authorUsername: auth.user?.username,
      text: cleaned,
      time: formatMessageTime(now),
      rawTime: now,
      side: 'right',
      replyTo: replyTo || undefined,
      forwardFrom: options?.forwardFromPreview,
      isForwarded: isFwdSend,
      status: 'sending',
    }

    messagesByConversation.value[conversationId] = [
      ...(messagesByConversation.value[conversationId] ?? []),
      optimistic,
    ]

    try {
      const convIdForApi = /^\d+$/.test(String(conversationId))
        ? Number(conversationId)
        : conversationId

      const replyToNumeric = parseNumericId(replyTo?.id)
      const forwardNumeric = parseNumericId(options?.forwardFromMessageId)
      if (options?.forwardFromMessageId && forwardNumeric == null) {
        console.warn(
          '[chat] forward: source message id is not a numeric server id — sending text only (no forward_from_id). Reload thread or use a message loaded from the API.',
        )
      }

      const body: Record<string, unknown> = {
        sender_id: auth.user?.id,
        conversation_id: convIdForApi,
        content: cleaned,
      }
      if (replyToNumeric != null) {
        body.reply_to_id = replyToNumeric
      }
      if (forwardNumeric != null) {
        body.forward_from_id = forwardNumeric
      }

      const raw = await api.post<unknown>('/api/messages', body)
      if (import.meta.env.DEV) console.debug('[chat] POST /api/messages →', raw);

      const dto = unwrapObject<MessageDto>(raw);

      const sentRawTime = dto.created_at ? toISOString(dto.created_at) : now;
      const realId = String(dto.id ?? tempId);
      const statusFromApi = (dto as unknown as Record<string, unknown>).status as string | undefined;

      const dtoRec = dto as unknown as Record<string, unknown>;
      const replyFromApiNested = pickReplyNested(dtoRec);
      const replyFromApi = replyFromApiNested ? replyToFromNested(replyFromApiNested) : undefined;
      const forwardFromApiNested = pickForwardNested(dtoRec);
      const forwardFromApi = forwardFromApiNested ? forwardFromFromNested(forwardFromApiNested) : undefined;

      // Replace optimistic message with confirmed one (+ reply quote from API when present)
      messagesByConversation.value[conversationId] = enrichQuotePreviews(
        (messagesByConversation.value[conversationId] ?? []).map((m) =>
          m.id === tempId
            ? {
              ...m,
              id: realId,
              text: dto.content ?? cleaned,
              time: dto.created_at ? formatMessageTime(dto.created_at) : m.time,
              rawTime: sentRawTime,
              status: (statusFromApi as Message['status']) || 'sent',
              replyTo: replyFromApi ?? m.replyTo,
              forwardFrom: forwardFromApi ?? m.forwardFrom,
              isForwarded: Boolean(forwardFromApi || m.forwardFrom || m.isForwarded),
            }
            : m,
        ),
      );

      // Update conversation preview & bubble to top
      conversations.value = conversations.value.map((c) =>
        c.id === conversationId
          ? { ...c, preview: truncate(cleaned), time: optimistic.time }
          : c,
      );
      const active = conversations.value.find((c) => c.id === conversationId);
      if (active) {
        conversations.value = [
          active,
          ...conversations.value.filter((c) => c.id !== conversationId),
        ];
      }
      const forwardSkipped = Boolean(options?.forwardFromMessageId) && forwardNumeric == null
      return forwardSkipped ? { ok: true, forwardMetadataSkipped: true } : { ok: true }
    } catch (err) {
      console.error('[chat] sendMessage failed:', err);
      messagesByConversation.value[conversationId] = (
        messagesByConversation.value[conversationId] ?? []
      ).filter((m) => m.id !== tempId);
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: msg }
    }
  }

  async function editMessage(messageId: string, content: string) {
    const cleaned = content.trim();
    const conversationId = activeConversationId.value;
    if (!cleaned || !conversationId) return;

    const messages = messagesByConversation.value[conversationId];
    if (!messages) return;

    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const msg = messages[idx];
    // Only allow editing own messages, within a 2-minute window
    if (msg?.side !== 'right') return;
    const createdAt = new Date(msg?.rawTime).getTime();
    if (Number.isNaN(createdAt)) return;
    if (Date.now() - createdAt > EDIT_WINDOW_MS) return;

    const previousText = msg?.text;
    const previousModified = msg?.modified;

    // Optimistic local update
    const updatedMessages = messages.map((m, i) =>
      i === idx ? { ...m, text: cleaned, modified: true } : m,
    );
    messagesByConversation.value[conversationId] = updatedMessages;

    // Also update conversation preview if this is the last message
    const last = updatedMessages[updatedMessages.length - 1];
    if (last && last.id === messageId) {
      conversations.value = conversations.value.map((c) =>
        c.id === conversationId ? { ...c, preview: truncate(cleaned) } : c,
      );
    }

    try {
      const convIdForApi = /^\d+$/.test(String(conversationId))
        ? Number(conversationId)
        : conversationId
      await api.patch<unknown>(`/api/messages/${messageId}`, {
        content: cleaned,
        conversation_id: convIdForApi,
      })
    } catch (err) {
      console.error('[chat] editMessage failed:', err)
      // Revert on error
      messagesByConversation.value[conversationId] = messages.map((m, i) =>
        i === idx ? { ...m, text: previousText ?? '', modified: previousModified } : m,
      )
    }
  }

  function loadDemoData() {
    const now = Date.now();
    const t = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();

    // -- Demo DM conversation --
    conversations.value = [
      { id: 'demo-dm', name: 'Alice Martin', preview: 'Sounds good, talk tomorrow!', time: formatTime(t(1)), unread: 0 },
      { id: 'demo-group', name: 'STORM project', preview: 'We will merge tonight', time: formatTime(t(3)), unread: 0 },
    ];

    membersByConversation.value['demo-dm'] = [
      { id: 'me', username: 'stan', displayName: 'Stan Husson', avatarUrl: undefined },
      { id: 'alice', username: 'alice_m', displayName: 'Alice Martin', avatarUrl: undefined },
    ];

    membersByConversation.value['demo-group'] = [
      { id: 'me', username: 'stan', displayName: 'Stan Husson', avatarUrl: undefined },
      { id: 'alice', username: 'alice_m', displayName: 'Alice Martin', avatarUrl: undefined },
      { id: 'bob', username: 'bob_dev', displayName: 'Bob Dupont', avatarUrl: undefined },
      { id: 'clara', username: 'clara_ui', displayName: 'Clara Vega', avatarUrl: undefined },
    ];

    // DM messages — text-based receipts
    messagesByConversation.value['demo-dm'] = [
      { id: 'dm-1', author: 'Alice Martin', text: 'Hey, did you see the last commit?', time: formatMessageTime(t(10)), rawTime: t(10), side: 'left' },
      { id: 'dm-2', author: 'Stan Husson', text: 'Yes, the refactor looks good', time: formatMessageTime(t(9)), rawTime: t(9), side: 'right', status: 'seen' },
      { id: 'dm-3', author: 'Alice Martin', text: 'Nice! Can we review it tomorrow?', time: formatMessageTime(t(5)), rawTime: t(5), side: 'left' },
      { id: 'dm-4', author: 'Stan Husson', text: 'Perfect, talk to you tomorrow!', time: formatMessageTime(t(4)), rawTime: t(4), side: 'right', status: 'delivered' },
      { id: 'dm-5', author: 'Stan Husson', text: 'I will push the branch tonight', time: formatMessageTime(t(1)), rawTime: t(1), side: 'right', status: 'sent' },
    ];

    // Group messages — stacked avatar receipts
    messagesByConversation.value['demo-group'] = [
      { id: 'grp-1', author: 'Bob Dupont', authorUsername: 'bob_dev', text: 'I fixed the WebSocket bug', time: formatMessageTime(t(20)), rawTime: t(20), side: 'left' },
      { id: 'grp-2', author: 'Bob Dupont', authorUsername: 'bob_dev', text: 'Reconnect works now', time: formatMessageTime(t(19)), rawTime: t(19), side: 'left' },
      { id: 'grp-3', author: 'Clara Vega', authorUsername: 'clara_ui', text: 'Nice! I will test on staging', time: formatMessageTime(t(15)), rawTime: t(15), side: 'left' },
      {
        id: 'grp-4', author: 'Stan Husson', authorUsername: 'stan', text: 'Top, je merge la feature reply-to', time: formatMessageTime(t(10)), rawTime: t(10), side: 'right', status: 'seen',
        seenBy: [
          { id: 'alice', displayName: 'Alice Martin' },
          { id: 'bob', displayName: 'Bob Dupont' },
          { id: 'clara', displayName: 'Clara Vega' },
        ],
      },
      {
        id: 'grp-5', author: 'Alice Martin', authorUsername: 'alice_m', text: 'Attention au conflit sur le chat store', time: formatMessageTime(t(7)), rawTime: t(7), side: 'left',
        replyTo: { id: 'grp-4', author: 'Stan Husson', text: 'Top, je merge la feature reply-to' },
      },
      {
        id: 'grp-6', author: 'Stan Husson', authorUsername: 'stan', text: 'On merge ce soir', time: formatMessageTime(t(3)), rawTime: t(3), side: 'right', status: 'seen',
        seenBy: [
          { id: 'bob', displayName: 'Bob Dupont' },
        ],
      },
      {
        id: 'grp-fwd-1',
        author: 'Clara Vega',
        authorUsername: 'clara_ui',
        text: 'I fixed the WebSocket bug',
        time: formatMessageTime(t(2.5)),
        rawTime: t(2.5),
        side: 'left',
        forwardFrom: { id: 'grp-1', author: 'Bob Dupont', text: 'I fixed the WebSocket bug' },
      },
      {
        id: 'grp-fwd-2',
        author: 'Stan Husson',
        authorUsername: 'stan',
        text: 'Noté, merci Clara',
        time: formatMessageTime(t(2)),
        rawTime: t(2),
        side: 'right',
        status: 'sent',
        forwardFrom: { id: 'grp-3', author: 'Clara Vega', text: 'Nice! I will test on staging' },
        replyTo: { id: 'grp-5', author: 'Alice Martin', text: 'Attention au conflit sur le chat store' },
      },
    ];

    activeConversationId.value = 'demo-dm';
  }

  function $reset() {
    destroyWebSocket();
    conversations.value = [];
    messagesByConversation.value = {};
    membersByConversation.value = {};
    activeConversationId.value = null;
  }

  return {
    // state
    conversations,
    activeConversationId,
    loadingConversations,
    loadingMessages,
    // getters
    activeConversation,
    activeConversationDisplayName,
    activeMessages,
    activeMembers,
    activeTypingUsers,
    membersLabel,
    memberAvatars,
    systemMessage,
    // actions
    fetchConversations,
    selectConversation,
    createConversation,
    sendMessage,
    editMessage,
    emitTyping,
    loadDemoData,
    initWebSocket,
    destroyWebSocket,
    $reset,
  };
});
