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

interface GroupMemberApi {
  id: number
  user_id: string
  conversation_id: number
  role: number
  created_at: number
}

interface MessageApi {
  id: number
  sender_id: string
  conversation_id: number
  content: string
  created_at: number
}

interface UserApi {
  id: string
  username: string
  display_name: string
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

function apiToMessage(msg: MessageApi, currentUserId: string, namesCache: Map<string, string>): Message {
  return {
    id: String(msg.id),
    author: namesCache.get(msg.sender_id) ?? msg.sender_id.slice(0, 8),
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
  const namesCache = new Map<string, string>()

  let ws: WebSocket | null = null

  function cacheCurrentUser() {
    if (auth.user?.id) {
      namesCache.set(auth.user.id, auth.user.display_name ?? auth.user.username ?? 'Me')
    }
  }

  async function fetchAndCacheUser(userId: string): Promise<string> {
    if (namesCache.has(userId)) return namesCache.get(userId)!
    try {
      const user = await api.get<UserApi>(`/users/${userId}`)
      const name = user.display_name ?? user.username ?? userId.slice(0, 8)
      namesCache.set(userId, name)
      return name
    } catch {
      return userId.slice(0, 8)
    }
  }

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
          const senderId = msg.user ?? ''
          const authorName = namesCache.get(senderId) ?? senderId.slice(0, 8)
          const newMessage: Message = {
            id: `m-${Date.now()}`,
            author: authorName,
            text: msg.content,
            time: formatTime(),
            side: senderId === auth.user?.id ? 'right' : 'left'
          }
          messagesByConversation.value[conversationId] = [
            ...(messagesByConversation.value[conversationId] ?? []),
            newMessage
          ]
          // Resolve name async if not cached
          if (senderId && !namesCache.has(senderId)) {
            fetchAndCacheUser(senderId)
          }
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

  async function loadGroupMembers(conversationId: string) {
    try {
      const res = await api.get<{ ok: boolean; data: GroupMemberApi[] }>(`/api/groups/${conversationId}/members`)
      if (res.ok && res.data) {
        const memberIds = res.data.map((m) => m.user_id)
        // Update participantIds on the conversation
        conversations.value = conversations.value.map((c) =>
          c.id === conversationId ? { ...c, participantIds: memberIds } : c
        )
        // Populate name cache for all members
        await Promise.all(memberIds.map((id) => fetchAndCacheUser(id)))
      }
    } catch {
      // silent fail
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const res = await api.get<{ ok: boolean; data: MessageApi[] }>(`/api/messages?conversation_id=${conversationId}`)
      if (res.ok && res.data) {
        messagesByConversation.value[conversationId] = res.data.map((m) =>
          apiToMessage(m, auth.user?.id ?? '', namesCache)
        ).reverse()
      }
    } catch {
      // silent fail
    }
  }

  watch(activeConversationId, async (newId) => {
    joinRoom(newId)
    if (newId) {
      await loadGroupMembers(newId)
      await loadMessages(newId)
    }
  })

  onMounted(async () => {
    cacheCurrentUser()
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

    const isGroup = participantIds.length > 1
    const generatedName = participants.length > 0
      ? (isGroup
          ? participants.slice(0, 3).map((user) => user.name).join(', ')
          : (participants[0]?.name ?? 'New conversation'))
      : 'New conversation'
    const conversationName = payload.name?.trim() || generatedName
    const now = formatTime()

    try {
      const res = await api.post<{ ok: boolean; data: GroupApi }>('/api/groups', {
        name: conversationName
      })

      if (!res.ok || !res.data) return

      const conversationId = String(res.data.id)

      // Add participants as members (role: 0)
      await Promise.all(
        participantIds.map((userId) =>
          api.post(`/api/groups/${conversationId}/members`, { user_id: userId, role: 0 }).catch(() => {})
        )
      )

      const newConversation: Conversation = {
        id: conversationId,
        name: conversationName,
        preview: isGroup ? 'Group created' : 'Conversation created',
        time: now,
        participantIds: [...new Set([...(auth.user?.id ? [auth.user.id] : []), ...participantIds])],
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

    const now = formatTime()
    const currentUserName = auth.user?.display_name ?? auth.user?.username ?? 'Me'
    const newMessage: Message = {
      id: `m-${Date.now()}`,
      author: currentUserName,
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

    api.post('/api/messages', { conversation_id: Number(conversationId), content: cleaned, sender_id: auth.user?.id ?? '' }).catch(() => {
      // message already shown locally — silent fail
    })
  }

  async function deleteGroup(conversationId: string) {
    await api.delete(`/api/groups/${conversationId}`)
    conversations.value = conversations.value.filter((c) => c.id !== conversationId)
    if (activeConversationId.value === conversationId) {
      activeConversationId.value = conversations.value[0]?.id ?? ''
    }
  }

  async function leaveGroup(conversationId: string) {
    await api.post(`/api/groups/${conversationId}/leave`, {})
    conversations.value = conversations.value.filter((c) => c.id !== conversationId)
    if (activeConversationId.value === conversationId) {
      activeConversationId.value = conversations.value[0]?.id ?? ''
    }
  }

  async function renameConversation(conversationId: string, name: string) {
    try {
      await api.put(`/api/groups/${conversationId}`, { name })
      conversations.value = conversations.value.map((c) =>
        c.id === conversationId ? { ...c, name } : c
      )
    } catch { /* silent */ }
  }

  async function removeMember(conversationId: string, userId: string) {
    await api.delete(`/api/groups/${conversationId}/members/${userId}`)
    conversations.value = conversations.value.map((c) =>
      c.id === conversationId
        ? { ...c, participantIds: c.participantIds.filter((id) => id !== userId) }
        : c
    )
  }

  async function updateMemberRole(conversationId: string, userId: string, role: number) {
    await api.patch(`/api/groups/${conversationId}/members/${userId}/role`, { role })
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
    deleteGroup,
    leaveGroup,
    removeMember,
    renameConversation,
    sendMessage,
    setActiveAccount,
    setActiveConversation,
    updateMemberRole
  }
}
