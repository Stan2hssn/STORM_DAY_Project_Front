// ---------------------------------------------------------------------------
// API response DTOs (snake_case, matching gateway JSON)
// ---------------------------------------------------------------------------

export interface GroupDto {
  id: string | number
  name: string
  created_at: string
  updated_at?: string
  owner_id?: string | number
  last_message?: {
    content: string
    sender_name?: string
    created_at: string
  } | null
  unread_count?: number
}

export interface MessageDto {
  id: string | number
  sender_id: string | number
  conversation_id: string | number
  content: string
  created_at: string
  sender_name?: string
}

export interface UserSearchDto {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

/** Result of POST /api/messages from the chat store */
export type SendMessageResult =
  | { ok: true; forwardMetadataSkipped?: boolean }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Front-end view models (camelCase, used by components)
// All IDs are normalized to strings in the store mappers.
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string
  name: string
  preview: string
  time: string
  unread: number
}

export interface ReplyTo {
  id: string
  author: string
  text: string
}

/** Original message snapshot when forwarding (same shape as a reply quote). */
export interface ForwardFrom {
  id: string
  author: string
  text: string
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen'

export interface SeenByUser {
  id: string
  displayName: string
}

export interface Message {
  id: string
  author: string
  authorUsername?: string
  text: string
  time: string
  rawTime: string
  side: 'left' | 'right'
  replyTo?: ReplyTo
  /** Source message if this is a forward (REST / WebSocket / optimistic). */
  forwardFrom?: ForwardFrom
  /** Forward without a full nested object (e.g. partial API response): still show the "Forwarded" label. */
  isForwarded?: boolean
  status?: MessageStatus
  seenBy?: SeenByUser[]
  /** True if the message was edited (REST or WebSocket update). */
  modified?: boolean
}

export interface ChatUser {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
}

export interface CreateGroupPayload {
  name: string
  memberIds: string[]
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
