<template>
  <Transition
    enter-active-class="duration-200 ease-out"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="duration-150 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <aside
      v-if="open"
      class="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l border-white/10 bg-[#111b21] shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <p class="text-base font-semibold text-[#e9edef]">Infos conversation</p>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="emit('close')" />
      </div>

      <!-- Avatar + nom -->
      <div class="flex flex-col items-center gap-2 border-b border-white/10 px-4 py-6">
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
          style="background: #00a884;"
        >
          {{ initials }}
        </div>

        <!-- Renommer le groupe (owner/admin seulement) -->
        <div v-if="isEditingName" class="flex w-full items-center gap-2 px-2">
          <input
            v-model="newName"
            class="flex-1 rounded-lg border border-white/20 bg-[#2a3942] px-3 py-1.5 text-sm text-[#e9edef] outline-none focus:border-[#00a884]"
            placeholder="Nouveau nom"
            @keyup.enter="saveGroupName"
          />
          <UButton icon="i-lucide-check" color="success" variant="ghost" size="xs" :loading="savingName" @click="saveGroupName" />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isEditingName = false" />
        </div>
        <div v-else class="flex items-center gap-1">
          <p class="text-lg font-semibold text-[#e9edef]">{{ conversation?.name }}</p>
          <UButton
            v-if="isAdmin && conversation?.isGroup"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="startEditName"
          />
        </div>

        <p class="text-xs text-[#8696a0]">{{ members.length }} membre{{ members.length > 1 ? 's' : '' }}</p>
      </div>

      <!-- Ajouter un membre (admin/owner, groupes seulement) -->
      <div v-if="isAdmin && conversation?.isGroup" class="border-b border-white/10 px-4 py-3">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Ajouter un membre</p>
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            class="flex-1 rounded-lg border border-white/20 bg-[#2a3942] px-3 py-1.5 text-sm text-[#e9edef] outline-none focus:border-[#00a884]"
            placeholder="Rechercher un utilisateur…"
            @input="searchUsers"
          />
        </div>

        <!-- Résultats de recherche -->
        <div v-if="searchResults.length" class="mt-2 max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-[#1d2c33]">
          <button
            v-for="user in searchResults"
            :key="user.id"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
            @click="addMember(user)"
          >
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a3942] text-xs font-bold text-white">
              {{ user.display_name.slice(0, 2).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-[#e9edef]">{{ user.display_name }}</p>
              <p class="truncate text-xs text-[#8696a0]">@{{ user.username }}</p>
            </div>
          </button>
        </div>
        <p v-if="addError" class="mt-1 text-xs text-red-400">{{ addError }}</p>
      </div>

      <!-- Liste des membres -->
      <div class="flex-1 overflow-y-auto">
        <p class="px-4 pt-4 text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Membres</p>

        <div v-if="loading" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-[#8696a0]" />
        </div>

        <div v-else class="space-y-1 px-2 py-2">
          <div
            v-for="member in members"
            :key="member.user_id"
            class="flex items-center gap-3 rounded-xl px-3 py-2 group"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style="background: #2a3942;"
            >
              {{ memberInitials(member.display_name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-[#e9edef]">{{ member.display_name }}</p>
              <p class="truncate text-xs text-[#8696a0]">@{{ member.username }}</p>
            </div>
            <span class="text-xs text-[#8696a0]">{{ roleLabel(member.role) }}</span>
            <!-- Retirer un membre (admin/owner, pas soi-même, pas owner) -->
            <UButton
              v-if="canRemove(member)"
              icon="i-lucide-user-minus"
              color="error"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeMember(member)"
            />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="border-t border-white/10 px-4 py-4">
        <UButton
          label="Quitter le groupe"
          icon="i-lucide-log-out"
          color="error"
          variant="ghost"
          block
          @click="emit('leave')"
        />
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Conversation } from '@/types/chat'

interface Member {
  user_id: string
  role: number
  display_name: string
  username: string
}

interface ApiMember {
  user_id: string
  role: number
}

interface ApiUser {
  id: string
  username: string
  display_name: string
}

const props = defineProps<{
  open: boolean
  conversation: Conversation | null
}>()

const emit = defineEmits<{
  close: []
  leave: []
}>()

const auth = useAuthStore()
const members = ref<Member[]>([])
const loading = ref(false)

// Renommer
const isEditingName = ref(false)
const newName = ref('')
const savingName = ref(false)

// Ajouter membre
const searchQuery = ref('')
const searchResults = ref<ApiUser[]>([])
const addError = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const initials = computed(() =>
  props.conversation?.name.slice(0, 2).toUpperCase() ?? '??'
)

const myRole = computed(() => {
  const me = members.value.find(m => m.user_id === auth.user?.id)
  return me?.role ?? 0
})

const isAdmin = computed(() => myRole.value >= 1)

function memberInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function roleLabel(role: number) {
  if (role === 2) return 'Owner'
  if (role === 1) return 'Admin'
  return 'Membre'
}

function canRemove(member: Member) {
  if (!isAdmin.value) return false
  if (member.user_id === auth.user?.id) return false
  if (member.role >= myRole.value) return false
  return true
}

async function fetchMembers(convId: string) {
  loading.value = true
  members.value = []
  try {
    const res = await api.get<{ ok: boolean; data?: ApiMember[] }>(`/api/groups/${convId}/members`)
    if (!res.ok || !res.data) return

    const resolved = await Promise.all(
      res.data.map(async (m) => {
        try {
          const user = await api.get<ApiUser>(`/users/${m.user_id}`)
          return {
            user_id: m.user_id,
            role: m.role,
            display_name: user.display_name || user.username,
            username: user.username,
          }
        } catch {
          return { user_id: m.user_id, role: m.role, display_name: m.user_id.slice(0, 8), username: m.user_id.slice(0, 8) }
        }
      })
    )
    members.value = resolved.sort((a, b) => b.role - a.role)
  } finally {
    loading.value = false
  }
}

function startEditName() {
  newName.value = props.conversation?.name ?? ''
  isEditingName.value = true
}

async function saveGroupName() {
  if (!props.conversation || !newName.value.trim()) return
  savingName.value = true
  try {
    await api.patch(`/api/groups/${props.conversation.id}`, { name: newName.value.trim() })
    props.conversation.name = newName.value.trim()
    isEditingName.value = false
  } catch {
    // silently ignore if endpoint doesn't exist
  } finally {
    savingName.value = false
  }
}

function searchUsers() {
  addError.value = ''
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const results = await api.get<ApiUser[]>(`/users/search?q=${encodeURIComponent(searchQuery.value)}`)
      const existingIds = new Set(members.value.map(m => m.user_id))
      searchResults.value = (Array.isArray(results) ? results : []).filter(u => !existingIds.has(u.id))
    } catch {
      searchResults.value = []
    }
  }, 300)
}

async function addMember(user: ApiUser) {
  if (!props.conversation) return
  addError.value = ''
  try {
    await api.post(`/api/groups/${props.conversation.id}/members`, { user_id: user.id })
    members.value.push({
      user_id: user.id,
      role: 0,
      display_name: user.display_name || user.username,
      username: user.username,
    })
    members.value.sort((a, b) => b.role - a.role)
    searchQuery.value = ''
    searchResults.value = []
  } catch (e: unknown) {
    addError.value = 'Impossible d\'ajouter ce membre.'
  }
}

async function removeMember(member: Member) {
  if (!props.conversation) return
  try {
    await api.delete(`/api/groups/${props.conversation.id}/members/${member.user_id}`)
    members.value = members.value.filter(m => m.user_id !== member.user_id)
  } catch {
    // silently ignore
  }
}

watch(
  () => props.open && props.conversation?.id,
  (val) => {
    if (val && props.conversation) {
      fetchMembers(props.conversation.id)
      isEditingName.value = false
      searchQuery.value = ''
      searchResults.value = []
    }
  },
  { immediate: true }
)
</script>
