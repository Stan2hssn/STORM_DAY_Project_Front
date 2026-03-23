import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  ApiGroup,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiMessage,
  ApiMessagesResponse,
  ApiSendMessageResponse,
  Conversation,
  CreateConversationPayload,
  Message,
} from '@/types/chat'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  if (!ts) return ''
  const ms = ts > 1_000_000_000_000 ? ts : ts * 1000
  const d = new Date(ms)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function truncate(text: string, max = 42): string {
  return text.length <= max ? text : text.slice(0, max - 3) + '...'
}

function groupToConversation(g: ApiGroup): Conversation {
  return {
    id: String(g.id),
    name: g.name || 'Conversation',
    preview: '',
    time: formatTimestamp(g.updated_at),
    participantIds: [],
    isGroup: false,
    unread: 0,
    avatarUrl: g.avatar_url,
  }
}

// ── Store ────────────────────────────────────────────────────────────────────────

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore()

  const conversations = ref<Conversation[]>([])
  const messagesByConversation = ref<Record<string, Message[]>>({})
  const userDisplayNames = ref<Record<string, string>>({})
  const activeConversationId = ref<string | null>(null)
  const loading = ref(false)
  const loadingMessages = ref(false)

  const activeConversation = computed(
    () => conversations.value.find(c => c.id === activeConversationId.value) ?? null,
  )

  const activeMessages = computed(
    () => (activeConversationId.value ? (messagesByConversation.value[activeConversationId.value] ?? []) : []),
  )

  // ── User display name cache ───────────────────────────────────────────────────

  async function fetchUserDisplayName(userId: string): Promise<string> {
    if (userDisplayNames.value[userId]) return userDisplayNames.value[userId]
    try {
      const res = await api.get<{ id: string; username: string; display_name: string }>(`/users/${userId}`)
      const name = res.display_name || res.username || userId.slice(0, 8)
      userDisplayNames.value[userId] = name
      return name
    } catch {
      const fallback = userId.slice(0, 8)
      userDisplayNames.value[userId] = fallback
      return fallback
    }
  }

  // ── Mapping ───────────────────────────────────────────────────────────────────

  function apiMessageToMessage(msg: ApiMessage, myId: string, authorName: string): Message {
    return {
      id: String(msg.id),
      author: authorName,
      text: msg.content,
      time: formatTimestamp(msg.created_at),
      side: msg.sender_id === myId ? 'right' : 'left',
      senderId: msg.sender_id,
      conversationId: String(msg.conversation_id),
      attachment: msg.attachment || undefined,
    }
  }

  // ── Conversations ─────────────────────────────────────────────────────────────

  async function fetchConversations() {
    loading.value = true
    try {
      const res = await api.get<ApiGroupsResponse>('/api/groups')
      if (res.ok && res.data) {
        conversations.value = res.data.map(groupToConversation)
        if (!activeConversationId.value && conversations.value.length > 0) {
          setActiveConversation(conversations.value[0]!.id)
        }
      }
    } finally {
      loading.value = false
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────────────

  async function fetchMessages(conversationId: string) {
    loadingMessages.value = true
    try {
      const res = await api.get<ApiMessagesResponse>(`/api/messages?conversation_id=${conversationId}`)
      if (res.ok && res.data) {
        const myId = auth.user?.id ?? ''
        // Pre-fetch all unique sender display names
        const senderIds = [...new Set(res.data.map(m => m.sender_id))]
        await Promise.all(senderIds.map(id => fetchUserDisplayName(id)))

        // API returns DESC (newest first), reverse to ASC for display
        const messages = res.data
          .map(msg => apiMessageToMessage(msg, myId, userDisplayNames.value[msg.sender_id] || msg.sender_id.slice(0, 8)))
          .reverse()

        messagesByConversation.value[conversationId] = messages

        // Update conversation preview with last message
        if (messages.length > 0) {
          const last = messages[messages.length - 1]!
          const conv = conversations.value.find(c => c.id === conversationId)
          if (conv) {
            conv.preview = truncate(last.text)
            conv.time = last.time
          }
        }
      }
    } finally {
      loadingMessages.value = false
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────────

  async function sendMessage(content: string, attachment?: string): Promise<boolean> {
    const convId = activeConversationId.value
    if (!convId || (!content.trim() && !attachment)) return false

    try {
      const res = await api.post<ApiSendMessageResponse>('/api/messages', {
        conversation_id: parseInt(convId, 10),
        content: content.trim(),
        ...(attachment ? { attachment } : {}),
      })

      if (res.ok && res.data) {
        const myId = auth.user?.id ?? ''
        const myName = auth.user?.display_name || auth.user?.username || 'Moi'
        const msg = apiMessageToMessage(res.data, myId, myName)

        if (!messagesByConversation.value[convId]) {
          messagesByConversation.value[convId] = []
        }
        messagesByConversation.value[convId].push(msg)

        // Bubble conversation to top with updated preview
        const idx = conversations.value.findIndex(c => c.id === convId)
        if (idx !== -1) {
          const conv = { ...conversations.value[idx]!, preview: truncate(content.trim()), time: msg.time }
          conversations.value.splice(idx, 1)
          conversations.value.unshift(conv)
        }

        return true
      }
      return false
    } catch {
      return false
    }
  }

  // ── Create conversation ───────────────────────────────────────────────────────

  async function createConversation(payload: CreateConversationPayload): Promise<Conversation | null> {
    try {
      // 1. Create group — actor is added as OWNER automatically
      const createRes = await api.post<ApiGroupResponse>('/api/groups', {
        name: payload.name?.trim() ?? '',
      })
      if (!createRes.ok || !createRes.data) return null

      const groupId = createRes.data.id

      // 2. Add each participant as member (role 0 = member)
      await Promise.all(
        payload.participantIds.map(userId =>
          api.post(`/api/groups/${groupId}/members`, { user_id: userId, role: 0 }),
        ),
      )

      // 3. Re-fetch the group so the gateway resolves the display name
      const getRes = await api.get<ApiGroupResponse>(`/api/groups/${groupId}`)
      const finalGroup = getRes.ok && getRes.data ? getRes.data : createRes.data

      const conv = groupToConversation(finalGroup)
      conv.isGroup = payload.participantIds.length > 1

      // Put new conversation at the top
      conversations.value.unshift(conv)
      messagesByConversation.value[conv.id] = []

      return conv
    } catch {
      return null
    }
  }

  // ── Leave conversation ────────────────────────────────────────────────────────

  async function leaveConversation(convId: string): Promise<boolean> {
    try {
      await api.post(`/api/groups/${convId}/leave`, {})
      conversations.value = conversations.value.filter(c => c.id !== convId)
      if (activeConversationId.value === convId) {
        activeConversationId.value = conversations.value[0]?.id ?? null
        if (activeConversationId.value) setActiveConversation(activeConversationId.value)
      }
      return true
    } catch {
      return false
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function setActiveConversation(id: string) {
    conversations.value.forEach(c => { c.active = c.id === id })
    const conv = conversations.value.find(c => c.id === id)
    if (conv) conv.unread = 0
    activeConversationId.value = id

    if (!messagesByConversation.value[id]) {
      fetchMessages(id)
    }
  }

  return {
    conversations,
    messagesByConversation,
    activeConversationId,
    activeConversation,
    activeMessages,
    loading,
    loadingMessages,
    userDisplayNames,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    leaveConversation,
    setActiveConversation,
  }
})
