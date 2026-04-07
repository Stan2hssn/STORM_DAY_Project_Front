import { useAuthStore } from '@/stores/auth'

export interface WsMessage {
  action: string
  room: string
  user: string
  username: string
  content: string
  /** Server message id — required for remote clients so edits (message_updated) can match */
  message_id?: string | number
  id?: string | number
}

type MessageHandler = (msg: WsMessage) => void
type OpenHandler = () => void

let socket: WebSocket | null = null
const openHandlers = new Set<OpenHandler>()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const handlers = new Set<MessageHandler>()

const RECONNECT_DELAY_MS = 3_000
const HEARTBEAT_INTERVAL_MS = 25_000
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.replace(/\/+$/, '')
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '')

function getWsUrl(): string {
  const auth = useAuthStore()
  const token = auth.accessToken ?? ''
  // In production, prefer explicit WS URL. Fallback to API URL-derived WS, then same-origin.
  const origin =
    WS_BASE_URL
    ?? (API_BASE_URL ? API_BASE_URL.replace(/^http/i, 'ws') : `${globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${globalThis.location.host}`)
  const q = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${origin}/ws${q}`
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'ping' }))
    }
  }, HEARTBEAT_INTERVAL_MS)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export function connect() {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    return
  }

  const url = getWsUrl()
  if (import.meta.env.DEV) console.debug('[ws] connecting to', url)
  socket = new WebSocket(url)

  socket.onopen = () => {
    console.debug('[ws] connected')
    startHeartbeat()
    openHandlers.forEach((h) => {
      try {
        h()
      } catch (e) {
        console.warn('[ws] onOpen handler error:', e)
      }
    })
  }

  socket.onmessage = (event) => {
    try {
      console.debug('[ws] raw frame:', event.data)
      const data = JSON.parse(event.data) as WsMessage
      console.debug('[ws] parsed:', data.action, data.room, '| handlers:', handlers.size)
      if (data.action === 'pong') return
      handlers.forEach((h) => h(data))
    } catch {
      console.warn('[ws] non-JSON frame:', event.data)
    }
  }

  socket.onclose = (event) => {
    console.debug('[ws] closed', event.code, event.reason)
    stopHeartbeat()
    scheduleReconnect()
  }

  socket.onerror = () => {
    console.error('[ws] error')
    socket?.close()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return

    if (auth.refreshToken) {
      await auth.refresh()
    }
    connect()
  }, RECONNECT_DELAY_MS)
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  stopHeartbeat()
  if (socket) {
    socket.onclose = null
    socket.close()
    socket = null
  }
}

export function send(payload: Record<string, unknown>) {
  if (socket?.readyState === WebSocket.OPEN) {
    console.debug('[ws] send:', payload)
    socket.send(JSON.stringify(payload))
  } else {
    console.warn('[ws] send failed, socket not open. readyState:', socket?.readyState)
  }
}

export function joinRoom(room: string) {
  send({ action: 'join', room })
}

export function onMessage(handler: MessageHandler) {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

/** Called every time the socket opens (including after reconnect). */
export function onConnectionOpen(handler: OpenHandler) {
  openHandlers.add(handler)
  if (socket?.readyState === WebSocket.OPEN) {
    queueMicrotask(() => handler())
  }
  return () => openHandlers.delete(handler)
}
