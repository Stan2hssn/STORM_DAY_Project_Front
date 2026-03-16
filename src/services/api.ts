import { useAuthStore } from '@/stores/auth'

const BASE_URL = ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = useAuthStore()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (auth.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`
  }

  let res = await fetch(BASE_URL + path, { ...options, headers })

  // Auto-refresh si 401
  if (res.status === 401 && auth.refreshToken) {
    const refreshed = await auth.refresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`
      res = await fetch(BASE_URL + path, { ...options, headers })
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
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
