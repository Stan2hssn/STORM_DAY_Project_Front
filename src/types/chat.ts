export interface Conversation {
  id: string
  name: string
  preview: string
  time: string
  participantIds: string[]
  isGroup: boolean
  unread?: number
  active?: boolean
  avatarUrl?: string
}

export interface Message {
  id: string
  author: string
  text: string
  time: string
  side: 'left' | 'right'
  senderId?: string
  conversationId?: string
  attachment?: string
  rawTimestamp?: number
  deleted?: boolean
}

export interface Account {
  id: string
  name: string
  role: string
  avatar: string
}

export interface DirectoryUser {
  id: string
  name: string
  handle: string
  avatar: string
  status: 'online' | 'offline'
}

export interface CreateConversationPayload {
  participantIds: string[]
  name?: string
}

// ── Backend API shapes ──────────────────────────────────────────────────────────

export interface ApiGroup {
  id: number
  name: string
  avatar_url: string
  created_by: string
  created_at: number
  updated_at: number
}

export interface ApiMessage {
  id: number
  sender_id: string
  conversation_id: number
  content: string
  attachment: string
  created_at: number
  updated_at: number
}

export interface ApiGroupsResponse {
  ok: boolean
  data?: ApiGroup[]
  error?: { code: string; message: string }
}

export interface ApiMessagesResponse {
  ok: boolean
  data?: ApiMessage[]
  next_cursor?: string
  error?: { code: string; message: string }
}

export interface ApiSendMessageResponse {
  ok: boolean
  data?: ApiMessage
  error?: { code: string; message: string }
}

export interface ApiGroupResponse {
  ok: boolean
  data?: ApiGroup
  error?: { code: string; message: string }
}
