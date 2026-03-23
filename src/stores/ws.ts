import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface WsMessage {
  action: string
  room: string
  user: string
  username: string
  content: string
}

interface TypingEntry {
  name: string
  convId: string
}

export const useWsStore = defineStore('ws', () => {
  const auth = useAuthStore()

  const socket = ref<WebSocket | null>(null)
  const connected = ref(false)
  const currentRoom = ref<string | null>(null)
  const typingUsers = ref<Record<string, TypingEntry>>({}) // userId → { name, convId }

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {}
  const messageHandlers: Array<(msg: WsMessage) => void> = []

  function onMessage(handler: (msg: WsMessage) => void) {
    messageHandlers.push(handler)
  }

  function connect() {
    if (socket.value?.readyState === WebSocket.OPEN) return
    const token = auth.accessToken
    if (!token) return

    const ws = new WebSocket(`ws://localhost:8080/ws?token=${encodeURIComponent(token)}`)

    ws.onopen = () => {
      connected.value = true
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      if (currentRoom.value) {
        ws.send(JSON.stringify({ action: 'join', room: currentRoom.value }))
      }
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string)
        messageHandlers.forEach(h => h(msg))

        if (msg.action === 'typing') {
          const parts = msg.room?.split(':')
          const convId = parts?.[1]
          if (!convId || msg.user === auth.user?.id) return

          typingUsers.value[msg.user] = { name: msg.username || 'Someone', convId }

          if (typingTimers[msg.user]) clearTimeout(typingTimers[msg.user])
          typingTimers[msg.user] = setTimeout(() => {
            delete typingUsers.value[msg.user]
          }, 3000)
        }
      } catch {
        // ignore
      }
    }

    ws.onclose = () => {
      connected.value = false
      socket.value = null
      reconnectTimer = setTimeout(() => {
        if (auth.isAuthenticated) connect()
      }, 3000)
    }

    ws.onerror = () => ws.close()

    socket.value = ws
  }

  function joinRoom(conversationId: string) {
    const room = `conversation:${conversationId}`
    currentRoom.value = room
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({ action: 'join', room }))
    }
  }

  function sendTyping(conversationId: string) {
    if (socket.value?.readyState !== WebSocket.OPEN) return
    socket.value.send(JSON.stringify({ action: 'typing', room: `conversation:${conversationId}` }))
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    socket.value?.close()
    socket.value = null
    connected.value = false
    currentRoom.value = null
  }

  return { connected, typingUsers, connect, disconnect, joinRoom, sendTyping, onMessage }
})
