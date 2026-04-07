import { useAuthStore } from '@/stores/auth'

const BASE_URL = ''

function withUserId(path: string, userId: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}user_id=${encodeURIComponent(userId)}`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = useAuthStore()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (auth.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`
  }

  // Pass user_id as query param + header (belt & suspenders — proxy may strip headers)
  if (auth.user?.id) {
    headers['X-User-ID'] = auth.user.id
  }
  const url = auth.user?.id
    ? BASE_URL + withUserId(path, auth.user.id)
    : BASE_URL + path

  if (import.meta.env.DEV) {
    console.debug('[api]', options.method ?? 'GET', url, '| user_id:', auth.user?.id ?? 'NONE')
  }

  let res = await fetch(url, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401 && auth.refreshToken) {
    const refreshed = await auth.refresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`
      const retryUrl = auth.user?.id
        ? BASE_URL + withUserId(path, auth.user.id)
        : BASE_URL + path
      res = await fetch(retryUrl, { ...options, headers })
    } else {
      auth.clear()
      window.location.href = '/login'
      throw new Error('Session expirée')
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : ({} as T)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}
