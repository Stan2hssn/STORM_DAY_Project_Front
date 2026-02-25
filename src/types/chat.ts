export interface Conversation {
  id: string
  name: string
  preview: string
  time: string
  participantIds: string[]
  isGroup: boolean
  unread?: number
  active?: boolean
}

export interface Message {
  id: string
  author: string
  text: string
  time: string
  side: 'left' | 'right'
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
