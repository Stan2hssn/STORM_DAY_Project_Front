import {
  accountsSeed,
  conversationsSeed,
  directoryUsersSeed,
  messagesByConversationSeed
} from '@/data/chat.mock'
import type {
  Account,
  Conversation,
  CreateConversationPayload,
  DirectoryUser,
  Message
} from '@/types/chat'
import { computed, ref } from 'vue'

function formatTime(date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toConversationPreview(text: string): string {
  return text.length <= 42 ? text : `${text.slice(0, 39)}...`
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function useChatWorkspace() {
  const accounts = ref<Account[]>(accountsSeed.map((account) => ({ ...account })))
  const directoryUsers = ref<DirectoryUser[]>(directoryUsersSeed.map((user) => ({ ...user })))
  const conversations = ref<Conversation[]>(conversationsSeed.map((conversation) => ({ ...conversation })))
  const messagesByConversation = ref<Record<string, Message[]>>(structuredClone(messagesByConversationSeed))
  const activeAccountId = ref(accounts.value[0]?.id ?? '')
  const activeConversationId = ref(
    conversations.value.find((conversation) => conversation.active)?.id
    ?? conversations.value[0]?.id
    ?? ''
  )

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

  function createConversation(payload: CreateConversationPayload) {
    const participantIds = [...new Set(payload.participantIds)].filter(Boolean)

    if (participantIds.length === 0) {
      return
    }

    const usersById = new Map(directoryUsers.value.map((user) => [user.id, user]))
    const participants = participantIds
      .map((id) => usersById.get(id))
      .filter((user): user is DirectoryUser => Boolean(user))

    if (participants.length === 0) {
      return
    }

    const isGroup = participants.length > 1
    const generatedName = isGroup
      ? participants.slice(0, 3).map((user) => user.name).join(', ')
      : (participants[0]?.name ?? 'New conversation')
    const conversationName = payload.name?.trim() || generatedName
    const now = formatTime()
    const baseId = slugify(conversationName) || `conv-${Date.now()}`
    const conversationId = `conv-${Date.now()}-${baseId}`

    const newConversation: Conversation = {
      id: conversationId,
      name: conversationName,
      preview: isGroup ? 'Group created' : 'Conversation created',
      time: now,
      participantIds: participants.map((participant) => participant.id),
      isGroup,
      active: true
    }

    conversations.value = [
      newConversation,
      ...conversations.value.map((conversation) => ({ ...conversation, active: false }))
    ]

    messagesByConversation.value[conversationId] = [
      {
        id: `m-${Date.now()}`,
        author: 'System',
        text: isGroup
          ? `Group "${conversationName}" created with ${participants.length} members`
          : `Conversation with ${conversationName} created`,
        time: now,
        side: 'left'
      }
    ]

    activeConversationId.value = conversationId
  }

  function sendMessage(text: string) {
    const cleaned = text.trim()
    const conversationId = activeConversationId.value

    if (!cleaned || !conversationId) {
      return
    }

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
      if (conversation.id !== conversationId) {
        return conversation
      }

      return {
        ...conversation,
        preview: toConversationPreview(cleaned),
        time: now
      }
    })

    const activeConversation = updatedConversations.find((conversation) => conversation.id === conversationId)
    conversations.value = [
      ...(activeConversation ? [activeConversation] : []),
      ...updatedConversations.filter((conversation) => conversation.id !== conversationId)
    ]
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
    if (!activeConversationId.value) {
      return []
    }

    return messagesByConversation.value[activeConversationId.value] ?? []
  })

  const membersLabel = computed(() => {
    const membersCount = activeConversation.value?.participantIds.length ?? 0
    return `${membersCount} member${membersCount > 1 ? 's' : ''}`
  })

  const memberRail = computed(() => {
    if (!activeConversation.value) {
      return []
    }

    const usersById = new Map(directoryUsers.value.map((user) => [user.id, user]))
    return activeConversation.value.participantIds
      .map((id) => usersById.get(id)?.avatar ?? id.slice(0, 2).toUpperCase())
      .slice(0, 12)
  })

  const systemMessage = computed(() => {
    if (!activeConversation.value) {
      return ''
    }

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
