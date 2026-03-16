import {
  accountsSeed,
  directoryUsersSeed,
} from '@/data/chat.mock'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  Account,
  Conversation,
  CreateConversationPayload,
  DirectoryUser,
  Message
} from '@/types/chat'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface GroupApi {
  id: number
  name: string
  created_by: string
  created_at: number
  updated_at: number
}

interface MessageApi {
  id: number
  sender_id: string
  conversation_id: number
  content: string
  created_at: number
}

function formatTime(date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toConversationPreview(text: string): string {
  return text.length <= 42 ? text : `${text.slice(0, 39)}...`
}

function groupToConversation(group: GroupApi): Conversation {
  return {
    id: String(group.id),
    name: group.name,
    preview: '',
    time: formatTime(new Date(group.created_at * 1000)),
    participantIds: [],
    isGroup: true,
    active: false
  }
}

function apiToMessage(msg: MessageApi, currentUserId: string): Message {
  return {
    id: String(msg.id),
    author: msg.sender_id,
    text: msg.content,
    time: formatTime(new Date(msg.created_at * 1000)),
    side: msg.sender_id === currentUserId ? 'right' : 'left'
  }
}

export function useChatWorkspace() {
  const auth = useAuthStore()
  const accounts = ref<Account[]>(accountsSeed.map((account) => ({ ...account })))
  const directoryUsers = ref<DirectoryUser[]>(directoryUsersSeed.map((user) => ({ ...user })))
  const conversations = ref<Conversation[]>([])
  const messagesByConversation = ref<Record<string, Message[]>>({})
  const activeAccountId = ref(accounts.value[0]?.id ?? '')
  const activeConversationId = ref('')

  let ws: WebSocket | null = null

  function connectWebSocket() {
    if (!auth.accessToken) return
    ws = new WebSocket(`/ws?token=${auth.accessToken}`)

    ws.onopen = () => {
      joinRoom(activeConversationId.value)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.action === 'message' && msg.room && msg.content) {
          const conversationId = msg.room.replace(/^group:/, '')
          const newMessage: Message = {
            id: `m-${Date.now()}`,
            author: msg.user ?? 'Unknown',
            text: msg.content,
            time: formatTime(),
            side: msg.user === auth.user?.id ? 'right' : 'left'
          }
          messagesByConversation.value[conversationId] = [
            ...(messagesByConversation.value[conversationId] ?? []),
            newMessage
          ]
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      ws = null
    }
  }

  function joinRoom(conversationId: string) {
    if (ws?.readyState === WebSocket.OPEN && conversationId) {
      ws.send(JSON.stringify({ action: 'join', room: `group:${conversationId}` }))
    }
  }

  async function loadGroups() {
    try {
      const res = await api.get<{ ok: boolean; data: GroupApi[] }>('/api/groups')
      if (res.ok && res.data?.length) {
        conversations.value = res.data.map((g, i) => ({ ...groupToConversation(g), active: i === 0 }))
        activeConversationId.value = String(res.data[0]?.id ?? '')
      }
    } catch {
      // silent fail — liste vide
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const res = await api.get<{ ok: boolean; data: MessageApi[] }>(`/api/messages?conversation_id=${conversationId}`)
      if (res.ok && res.data) {
        messagesByConversation.value[conversationId] = res.data.map((m) =>
          apiToMessage(m, auth.user?.id ?? '')
        )
      }
    } catch {
      // silent fail
    }
  }

  watch(activeConversationId, async (newId) => {
    joinRoom(newId)
    if (newId) await loadMessages(newId)
  })

  onMounted(async () => {
    connectWebSocket()
    if (auth.isAuthenticated) {
      await loadGroups()
    }
  })

  onUnmounted(() => {
    ws?.close()
  })

  function setActiveConversation(conversationId: string) {
    activeConversationId.value = conversationId
    conversations.value = conversations.value.map((conversation) => ({
      ...conversation,
      unread: conversation.id === conversationId ? 0 : conversation.unread,
      active: conversation.id === conversationId
    }))
  }

  function setActiveAccount(accountId: string) {
    activeAccountId.value = accountId
  }

  async function createConversation(payload: CreateConversationPayload) {
    const participantIds = [...new Set(payload.participantIds)].filter(Boolean)
    if (participantIds.length === 0) return

    const usersById = new Map(directoryUsers.value.map((user) => [user.id, user]))
    const participants = participantIds
      .map((id) => usersById.get(id))
      .filter((user): user is DirectoryUser => Boolean(user))

    if (participants.length === 0) return

    const isGroup = participants.length > 1
    const generatedName = isGroup
      ? participants.slice(0, 3).map((user) => user.name).join(', ')
      : (participants[0]?.name ?? 'New conversation')
    const conversationName = payload.name?.trim() || generatedName
    const now = formatTime()

    try {
      const res = await api.post<{ ok: boolean; data: GroupApi }>('/api/groups', {
        name: conversationName
      })

      if (!res.ok || !res.data) return

      const conversationId = String(res.data.id)

      const newConversation: Conversation = {
        id: conversationId,
        name: conversationName,
        preview: isGroup ? 'Group created' : 'Conversation created',
        time: now,
        participantIds: participants.map((p) => p.id),
        isGroup,
        active: true
      }

      conversations.value = [
        newConversation,
        ...conversations.value.map((c) => ({ ...c, active: false }))
      ]

      messagesByConversation.value[conversationId] = []
      activeConversationId.value = conversationId
      joinRoom(conversationId)
    } catch {
      // silent fail
    }
  }

  function sendMessage(text: string) {
    const cleaned = text.trim()
    const conversationId = activeConversationId.value

    if (!cleaned || !conversationId) return

    const account = accounts.value.find((entry) => entry.id === activeAccountId.value)
    const now = formatTime()
    const newMessage: Message = {
      id: `m-${Date.now()}`,
      author: account?.name ?? 'You',
      text: cleaned,
      time: now,
      side: 'right'
    }

    messagesByConversation.value[conversationId] = [
      ...(messagesByConversation.value[conversationId] ?? []),
      newMessage
    ]

    const updatedConversations = conversations.value.map((conversation) => {
      if (conversation.id !== conversationId) return conversation
      return { ...conversation, preview: toConversationPreview(cleaned), time: now }
    })

    const activeConversation = updatedConversations.find((c) => c.id === conversationId)
    conversations.value = [
      ...(activeConversation ? [activeConversation] : []),
      ...updatedConversations.filter((c) => c.id !== conversationId)
    ]

    api.post('/api/messages', { conversation_id: Number(conversationId), content: cleaned }).catch(() => {
      // message already shown locally — silent fail
    })
  }

  const activeConversation = computed(() => {
    return conversations.value.find((conversation) => conversation.id === activeConversationId.value)
      ?? conversations.value[0]
      ?? null
  })

  const activeAccount = computed(() => {
    return accounts.value.find((account) => account.id === activeAccountId.value) ?? null
  })

  const activeMessages = computed(() => {
    if (!activeConversationId.value) return []
    return messagesByConversation.value[activeConversationId.value] ?? []
  })

  const membersLabel = computed(() => {
    const membersCount = activeConversation.value?.participantIds.length ?? 0
    return `${membersCount} member${membersCount > 1 ? 's' : ''}`
  })

  const memberRail = computed(() => {
    if (!activeConversation.value) return []
    const usersById = new Map(directoryUsers.value.map((user) => [user.id, user]))
    return activeConversation.value.participantIds
      .map((id) => usersById.get(id)?.avatar ?? id.slice(0, 2).toUpperCase())
      .slice(0, 12)
  })

  const systemMessage = computed(() => {
    if (!activeConversation.value) return ''
    return activeConversation.value.isGroup
      ? `You created ${activeConversation.value.name}`
      : `Private conversation with ${activeConversation.value.name}`
  })

  return {
    accounts,
    activeAccount,
    activeAccountId,
    activeConversation,
    activeMessages,
    conversations,
    directoryUsers,
    memberRail,
    membersLabel,
    systemMessage,
    createConversation,
    sendMessage,
    setActiveAccount,
    setActiveConversation
  }
}
