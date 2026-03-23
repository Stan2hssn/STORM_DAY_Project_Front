import { computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useWsStore } from '@/stores/ws'
import type { Account, CreateConversationPayload } from '@/types/chat'

export function useChatWorkspace() {
  const auth = useAuthStore()
  const chat = useChatStore()
  const ws = useWsStore()

  onMounted(() => {
    if (auth.isAuthenticated) {
      chat.fetchConversations()
      ws.connect()

      // Demande permission notifications une fois
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      ws.onMessage((msg) => {
        if (msg.action !== 'message') return
        const myId = auth.user?.id ?? ''
        if (msg.user === myId) return

        const parts = msg.room?.split(':')
        const convId = parts?.[1]
        if (!convId) return

        const now = new Date()
        const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

        if (!chat.messagesByConversation[convId]) {
          chat.messagesByConversation[convId] = []
        }
        chat.messagesByConversation[convId].push({
          id: `ws-${Date.now()}`,
          author: msg.username || msg.user.slice(0, 8),
          text: msg.content,
          time,
          side: 'left',
          senderId: msg.user,
          conversationId: convId,
        })

        const conv = chat.conversations.find(c => c.id === convId)
        if (conv) {
          conv.preview = msg.content.length > 42 ? msg.content.slice(0, 39) + '...' : msg.content
          conv.time = time
          if (convId !== chat.activeConversationId) {
            conv.unread = (conv.unread ?? 0) + 1
            // Notification navigateur si l'onglet n'est pas actif
            if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
              new Notification(msg.username || 'Nouveau message', {
                body: msg.content,
                icon: '/favicon.ico',
              })
            }
          }
        }
      })
    }
  })

  onUnmounted(() => {
    ws.disconnect()
  })

  // ── Accounts ──────────────────────────────────────────────────────────────────
  // Single account = the logged-in user

  const accounts = computed<Account[]>(() => {
    if (!auth.user) return []
    const name = auth.user.display_name || auth.user.username
    return [{ id: auth.user.id, name, role: 'Member', avatar: name.slice(0, 2).toUpperCase() }]
  })

  const activeAccountId = computed(() => auth.user?.id ?? '')
  const activeAccount = computed(() => accounts.value[0] ?? null)

  // ── Directory users ───────────────────────────────────────────────────────────
  // Empty — CreateConversationPanel handles its own search via /users/search

  const directoryUsers = computed(() => [])

  // ── Rail & labels ─────────────────────────────────────────────────────────────

  const memberRail = computed(() => {
    const conv = chat.activeConversation
    if (!conv) return []
    return [conv.name.slice(0, 2).toUpperCase()]
  })

  const membersLabel = computed(() => {
    const count = chat.activeConversation?.participantIds.length ?? 0
    return count ? `${count} member${count > 1 ? 's' : ''}` : ''
  })

  const systemMessage = computed(() => {
    const conv = chat.activeConversation
    if (!conv) return ''
    return conv.isGroup ? `Group: ${conv.name}` : `Conversation with ${conv.name}`
  })

  // ── Actions ───────────────────────────────────────────────────────────────────

  function setActiveConversation(id: string) {
    chat.setActiveConversation(id)
    ws.joinRoom(id)
  }

  function setActiveAccount(_id: string) {
    // Single-user mode — no-op
  }

  async function createConversation(payload: CreateConversationPayload) {
    const conv = await chat.createConversation(payload)
    if (conv) {
      chat.setActiveConversation(conv.id)
    }
  }

  async function sendMessage(text: string, attachment?: string) {
    await chat.sendMessage(text, attachment)
  }

  const typingLabel = computed(() => {
    const convId = chat.activeConversationId
    if (!convId) return ''
    const entries = Object.values(ws.typingUsers).filter(e => e.convId === convId)
    if (!entries.length) return ''
    if (entries.length === 1) return `${entries[0]!.name} is typing…`
    return `${entries.map(e => e.name).join(', ')} are typing…`
  })

  async function leaveConversation() {
    const convId = chat.activeConversationId
    if (!convId) return
    await chat.leaveConversation(convId)
  }

  return {
    accounts,
    activeAccount,
    activeAccountId,
    activeConversation: computed(() => chat.activeConversation),
    activeMessages: computed(() => chat.activeMessages),
    conversations: computed(() => chat.conversations),
    directoryUsers,
    memberRail,
    membersLabel,
    systemMessage,
    typingLabel,
    wsConnected: computed(() => ws.connected),
    createConversation,
    leaveConversation,
    sendMessage,
    sendTyping: (convId: string) => ws.sendTyping(convId),
    setActiveAccount,
    setActiveConversation,
  }
}
