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
        <p class="text-base font-semibold text-[#e9edef]">
          {{ is1on1 ? 'Profil du contact' : 'Infos conversation' }}
        </p>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="emit('close')" />
      </div>

      <!-- Avatar + nom -->
      <div class="flex flex-col items-center gap-2 border-b border-white/10 px-4 py-6">

        <!-- Avatar cliquable pour upload (groupes seulement) -->
        <div
          class="relative"
          :class="!is1on1 && isAdmin ? 'group cursor-pointer' : ''"
          @click="!is1on1 && isAdmin ? triggerAvatarInput() : undefined"
        >
          <img
            v-if="currentAvatarUrl"
            :src="currentAvatarUrl"
            alt="avatar"
            class="h-20 w-20 rounded-full object-cover"
          />
          <div
            v-else
            class="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style="background: #00a884;"
          >
            {{ initials }}
          </div>
          <!-- Overlay upload avatar groupe -->
          <div
            v-if="!is1on1 && isAdmin"
            class="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <UIcon name="i-lucide-camera" class="text-lg text-white" />
            <span class="text-[10px] text-white mt-0.5">Photo</span>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
        </div>
        <p v-if="uploadingAvatar" class="text-xs text-[#8696a0]">Upload en cours…</p>

        <!-- Renommer (groupes ET 1-on-1) -->
        <div v-if="isEditingName" class="flex w-full items-center gap-2 px-2">
          <input
            v-model="newName"
            class="flex-1 rounded-lg border border-white/20 bg-[#2a3942] px-3 py-1.5 text-sm text-[#e9edef] outline-none focus:border-[#00a884]"
            :placeholder="is1on1 ? 'Renommer ce contact' : 'Nouveau nom'"
            @keyup.enter="saveGroupName"
          />
          <UButton icon="i-lucide-check" color="success" variant="ghost" size="xs" :loading="savingName" @click="saveGroupName" />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isEditingName = false" />
        </div>
        <div v-else class="flex items-center gap-1">
          <p class="text-lg font-semibold text-[#e9edef]">{{ conversation?.name }}</p>
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="startEditName"
          />
        </div>

        <p v-if="!loading" class="text-xs text-[#8696a0]">
          {{ is1on1 ? `@${otherContact?.username ?? ''}` : `${members.length} membre${members.length > 1 ? 's' : ''}` }}
        </p>
      </div>

      <!-- Ajouter un membre (admin/owner, groupes seulement) -->
      <div v-if="!is1on1" class="border-b border-white/10 px-4 py-3">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Ajouter un membre</p>
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            class="flex-1 rounded-lg border border-white/20 bg-[#2a3942] px-3 py-1.5 text-sm text-[#e9edef] outline-none focus:border-[#00a884]"
            placeholder="Rechercher un utilisateur…"
            @input="searchUsers"
          />
        </div>
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

      <!-- Onglets Membres / Médias -->
      <div class="flex border-b border-white/10">
        <button
          class="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
          :class="activeTab === 'membres' ? 'border-b-2 border-[#00a884] text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'"
          @click="activeTab = 'membres'"
        >
          Membres
        </button>
        <button
          class="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
          :class="activeTab === 'medias' ? 'border-b-2 border-[#00a884] text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'"
          @click="activeTab = 'medias'"
        >
          Médias
        </button>
      </div>

      <!-- Onglet Membres -->
      <div v-if="activeTab === 'membres'" class="flex-1 overflow-y-auto">
        <div v-if="loading" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-[#8696a0]" />
        </div>
        <div v-else class="space-y-1 px-2 py-2">
          <div
            v-for="member in members"
            :key="member.user_id"
            class="group flex items-center gap-3 rounded-xl px-3 py-2"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style="background: #2a3942;">
              {{ memberInitials(member.display_name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-[#e9edef]">{{ member.display_name }}</p>
              <p class="truncate text-xs text-[#8696a0]">@{{ member.username }}</p>
            </div>
            <span class="text-xs text-[#8696a0]">{{ roleLabel(member.role) }}</span>
            <UButton
              v-if="canRemove(member)"
              icon="i-lucide-user-minus"
              color="error"
              variant="ghost"
              size="xs"
              class="opacity-0 transition-opacity group-hover:opacity-100"
              @click="removeMember(member)"
            />
          </div>
        </div>
      </div>

      <!-- Onglet Médias -->
      <div v-else class="flex-1 overflow-y-auto px-3 py-3">
        <div v-if="sharedImages.length === 0 && sharedFiles.length === 0" class="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <UIcon name="i-lucide-image" class="text-3xl text-[#3a4a52]" />
          <p class="text-sm text-[#8696a0]">Aucun média partagé</p>
        </div>

        <div v-if="sharedImages.length > 0">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Photos & vidéos</p>
          <div class="grid grid-cols-3 gap-1">
            <div
              v-for="(msg, i) in sharedImages"
              :key="msg.id"
              class="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-[#2a3942]"
              @click="openLightbox(i)"
            >
              <img :src="msg.attachment" alt="" class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
              <div class="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            </div>
          </div>
        </div>

        <div v-if="sharedFiles.length > 0" :class="sharedImages.length > 0 ? 'mt-4' : ''">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Fichiers</p>
          <div class="space-y-1">
            <a
              v-for="msg in sharedFiles"
              :key="msg.id"
              :href="msg.attachment"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
            >
              <UIcon name="i-lucide-file" class="shrink-0 text-[#8696a0]" />
              <span class="min-w-0 flex-1 truncate text-[#e9edef]">{{ fileNameFromUrl(msg.attachment!) }}</span>
              <UIcon name="i-lucide-download" class="shrink-0 text-[#8696a0]" />
            </a>
          </div>
        </div>
      </div>

      <!-- Actions bas -->
      <div class="space-y-2 border-t border-white/10 px-4 py-4">
        <!-- Bloquer / Débloquer (1-on-1 seulement) -->
        <UButton
          v-if="is1on1 && otherContact"
          :label="isOtherBlocked ? 'Débloquer ce contact' : 'Bloquer ce contact'"
          :icon="isOtherBlocked ? 'i-lucide-user-check' : 'i-lucide-user-x'"
          :color="isOtherBlocked ? 'neutral' : 'warning'"
          variant="ghost"
          block
          @click="toggleBlock"
        />
        <UButton
          :label="is1on1 ? 'Quitter la conversation' : 'Quitter le groupe'"
          icon="i-lucide-log-out"
          color="error"
          variant="ghost"
          block
          @click="leaveConversation"
        />
        <UButton
          label="Supprimer la discussion"
          icon="i-lucide-trash-2"
          color="error"
          variant="solid"
          block
          @click="emit('delete')"
        />
      </div>
    </aside>
  </Transition>

  <!-- Lightbox médias -->
  <Teleport to="body">
    <div
      v-if="lightboxIndex !== null"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      @click="lightboxIndex = null"
    >
      <button
        v-if="lightboxIndex > 0"
        class="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
        @click.stop="lightboxIndex--"
      >
        <UIcon name="i-lucide-chevron-left" class="text-xl" />
      </button>

      <img
        :src="sharedImages[lightboxIndex]?.attachment"
        alt=""
        class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        @click.stop
      />

      <button
        v-if="lightboxIndex < sharedImages.length - 1"
        class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
        @click.stop="lightboxIndex++"
      >
        <UIcon name="i-lucide-chevron-right" class="text-xl" />
      </button>

      <div class="absolute right-4 top-4 flex items-center gap-2">
        <span class="text-sm text-white/60">{{ lightboxIndex + 1 }} / {{ sharedImages.length }}</span>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" class="text-white" @click="lightboxIndex = null" />
      </div>

      <a
        :href="sharedImages[lightboxIndex]?.attachment"
        target="_blank"
        rel="noopener noreferrer"
        class="absolute left-4 top-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
        @click.stop
      >
        <UIcon name="i-lucide-download" class="text-xl" />
      </a>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useBlockStore } from '@/stores/block'
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
  delete: []
}>()

const auth = useAuthStore()
const chatStore = useChatStore()
const blockStore = useBlockStore()

const members = ref<Member[]>([])
const loading = ref(false)
const activeTab = ref<'membres' | 'medias'>('membres')

// Renommer
const isEditingName = ref(false)
const newName = ref('')
const savingName = ref(false)

// Ajouter membre
const searchQuery = ref('')
const searchResults = ref<ApiUser[]>([])
const addError = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// Avatar upload
const avatarInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)
const currentAvatarUrl = ref<string | null>(null)

// Lightbox
const lightboxIndex = ref<number | null>(null)

// ── Médias partagés ────────────────────────────────────────────────────────────

const conversationMessages = computed(() => chatStore.activeMessages)

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(url)
}

const sharedImages = computed(() =>
  conversationMessages.value.filter(m => m.attachment && isImageUrl(m.attachment))
)

const sharedFiles = computed(() =>
  conversationMessages.value.filter(m => m.attachment && !isImageUrl(m.attachment))
)

function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'fichier')
  } catch {
    return 'fichier'
  }
}

function openLightbox(index: number) {
  lightboxIndex.value = index
}

// ── Détection 1-on-1 ──────────────────────────────────────────────────────────

const is1on1 = computed(() => !loading.value && members.value.length <= 2)

const otherContact = computed(() => {
  if (!is1on1.value) return null
  return members.value.find(m => m.user_id !== auth.user?.id) ?? null
})

const isOtherBlocked = computed(() =>
  otherContact.value ? blockStore.isBlocked(otherContact.value.user_id) : false
)

function toggleBlock() {
  if (!otherContact.value) return
  if (isOtherBlocked.value) {
    blockStore.unblockUser(otherContact.value.user_id)
  } else {
    blockStore.blockUser(otherContact.value.user_id)
  }
}

// ── Computed ──────────────────────────────────────────────────────────────────

const initials = computed(() =>
  props.conversation?.name.slice(0, 2).toUpperCase() ?? '??'
)

const myRole = computed(() => {
  const me = members.value.find(m => m.user_id === auth.user?.id)
  return me?.role ?? 0
})

const isAdmin = computed(() => myRole.value >= 1)

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (is1on1.value) return false
  if (member.user_id === auth.user?.id) return false
  if (member.role >= myRole.value) return false
  return true
}

// ── Avatar upload ─────────────────────────────────────────────────────────────

function triggerAvatarInput() {
  avatarInput.value?.click()
}

async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !props.conversation) return
  uploadingAvatar.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/media/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: form,
    })
    if (!res.ok) return
    const data = await res.json()
    const url = data.url as string
    await api.patch(`/api/groups/${props.conversation.id}`, { avatar_url: url })
    currentAvatarUrl.value = url
    // Met à jour dans le store
    const conv = chatStore.conversations.find(c => c.id === props.conversation!.id)
    if (conv) conv.avatarUrl = url
  } finally {
    uploadingAvatar.value = false
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

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
  const trimmed = newName.value.trim()
  // Update locally immediately (API route may not exist yet)
  const conv = chatStore.conversations.find(c => c.id === props.conversation!.id)
  if (conv) conv.name = trimmed
  isEditingName.value = false
  try {
    await api.patch(`/api/groups/${props.conversation.id}`, { name: trimmed })
  } catch {
    // silently ignore — local update already applied
  } finally {
    savingName.value = false
  }
}

function searchUsers() {
  addError.value = ''
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const raw = await api.get<unknown>(`/users/search?q=${encodeURIComponent(searchQuery.value)}`)
      // Backend can return array directly or wrapped in { users: [...] } or { data: [...] }
      const list: ApiUser[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>)?.users)
          ? (raw as Record<string, unknown>).users as ApiUser[]
          : Array.isArray((raw as Record<string, unknown>)?.data)
            ? (raw as Record<string, unknown>).data as ApiUser[]
            : []
      const existingIds = new Set(members.value.map(m => m.user_id))
      searchResults.value = list.filter(u => u.id && !existingIds.has(String(u.id)))
    } catch {
      searchResults.value = []
    }
  }, 300)
}

async function addMember(user: ApiUser) {
  if (!props.conversation) return
  addError.value = ''
  try {
    await api.post(`/api/groups/${props.conversation.id}/members`, { user_id: String(user.id), role: 0 })
    members.value.push({ user_id: String(user.id), role: 0, display_name: user.display_name || user.username, username: user.username })
    members.value.sort((a, b) => b.role - a.role)
    searchQuery.value = ''
    searchResults.value = []
  } catch (err) {
    addError.value = 'Impossible d\'ajouter ce membre.'
    console.error('[InfoPanel] addMember failed:', err)
  }
}

async function leaveConversation() {
  if (!props.conversation) return
  try {
    await api.post(`/api/groups/${props.conversation.id}/leave`, {})
  } catch (err) {
    console.error('[InfoPanel] leave failed:', err)
  }
  emit('leave')
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
      currentAvatarUrl.value = props.conversation.avatarUrl ?? null
      isEditingName.value = false
      searchQuery.value = ''
      searchResults.value = []
      activeTab.value = 'membres'
      lightboxIndex.value = null
    }
  },
  { immediate: true }
)
</script>
