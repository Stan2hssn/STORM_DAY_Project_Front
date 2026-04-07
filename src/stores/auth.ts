import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: string
  username: string
  display_name: string
  email: string
  avatar_url?: string
}

function parseUser(): User | null {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const user = ref<User | null>(parseUser())

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  function setTokens(access: string, refresh: string, userData: User) {
    accessToken.value = access
    refreshToken.value = refresh
    user.value = userData
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function clear() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }

  async function login(email: string, password: string) {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      if (res.status >= 500) throw new Error('Email ou mot de passe incorrect')
      const data = await res.json().catch(() => ({}))
      const msg = typeof data.message === 'string' ? data.message : 'Email ou mot de passe incorrect'
      throw new Error(msg)
    }
    const data = await res.json()
    setTokens(data.access_token, data.refresh_token, data.user)
  }

  async function register(username: string, display_name: string, email: string, password: string) {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name, email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = typeof data.message === 'string' ? data.message : "Erreur lors de l'inscription"
      throw new Error(msg)
    }
    const data = await res.json()
    setTokens(data.access_token, data.refresh_token, data.user)
  }

  async function refresh(): Promise<boolean> {
    if (!refreshToken.value) return false
    try {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken.value }),
      })
      if (!res.ok) return false
      const data = await res.json()
      accessToken.value = data.access_token
      refreshToken.value = data.refresh_token
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      return true
    } catch {
      return false
    }
  }

  async function logout() {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
    } finally {
      clear()
    }
  }

  async function updateProfile(displayName: string): Promise<void> {
    if (!user.value) throw new Error('Not authenticated')
    const res = await fetch(`/users/${user.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.value}`,
      },
      body: JSON.stringify({ display_name: displayName }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(typeof data.message === 'string' ? data.message : 'Failed to update profile')
    }
    const updated = await res.json().catch(() => ({}))
    const newDisplayName = updated.display_name ?? updated.user?.display_name ?? displayName
    user.value = { ...user.value, display_name: newDisplayName }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!user.value) throw new Error('Not authenticated')
    const res = await fetch(`/users/${user.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.value}`,
      },
      body: JSON.stringify({ current_password: currentPassword, password: newPassword }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(typeof data.message === 'string' ? data.message : 'Failed to update password')
    }
  }

  return { accessToken, refreshToken, user, isAuthenticated, login, register, refresh, logout, clear, setTokens, updateProfile, updatePassword }
})
