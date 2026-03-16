<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#03070c]/78 px-4 backdrop-blur-sm"
      >
        <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#101b22] shadow-2xl">
          <header class="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <p class="text-lg font-semibold text-[#e9edef]">Group settings</p>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="emit('close')" />
          </header>

          <!-- Rename (admin only — backend route not yet implemented) -->
          <div v-if="isCurrentUserAdmin" class="border-b border-white/10 px-5 py-4">
            <p class="mb-2 text-xs font-medium text-[#8696a0]">GROUP NAME</p>
            <div class="flex gap-2">
              <UInput
                v-model="groupNameDraft"
                class="flex-1"
                :ui="{ base: 'bg-[#172833] ring-white/10 text-[#d9dee0]' }"
              />
              <UButton
                label="Save"
                color="primary"
                disabled
                title="Rename not yet supported by the backend"
              />
            </div>
            <p class="mt-1 text-xs text-[#8696a0]">Rename not yet available — backend route missing.</p>
          </div>

          <!-- Delete group (admin only) -->
          <div v-if="isCurrentUserAdmin" class="border-b border-white/10 px-5 py-3">
            <UButton
              label="Delete group"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              :loading="deletingGroup"
              @click="handleDelete"
            />
          </div>

          <!-- Leave group (all members) -->
          <div class="border-b border-white/10 px-5 py-3">
            <UButton
              label="Leave group"
              icon="i-lucide-log-out"
              color="error"
              variant="ghost"
              :loading="leavingGroup"
              @click="handleLeave"
            />
            <p v-if="leaveError" class="mt-2 text-xs text-red-400">{{ leaveError }}</p>
          </div>

          <!-- Members list -->
          <div class="chat-scroll max-h-[360px] space-y-1 overflow-y-auto p-3">
            <p class="px-2 py-1 text-xs font-medium text-[#8696a0]">
              {{ members.length }} member{{ members.length > 1 ? 's' : '' }}
            </p>

            <div v-if="loading" class="py-6 text-center text-sm text-[#8696a0]">
              Loading…
            </div>

            <div
              v-for="member in members"
              :key="member.userId"
              class="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#172833]"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style="background: #2a3942;"
              >
                {{ member.initials }}
              </div>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-[#e9edef]">
                  {{ member.name }}
                  <span v-if="member.userId === currentUserId" class="text-xs text-[#8696a0]"> (you)</span>
                </p>
                <p class="text-xs" :class="member.role === 1 ? 'text-[#00a884]' : 'text-[#8696a0]'">
                  {{ member.role === 1 ? 'Admin' : 'Member' }}
                </p>
              </div>

              <!-- Only admins can manage others -->
              <div v-if="isCurrentUserAdmin && member.userId !== currentUserId" class="flex items-center gap-1">
                <UButton
                  :label="member.role === 1 ? 'Remove admin' : 'Set admin'"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :loading="member.loadingRole"
                  @click="toggleRole(member)"
                />
                <UButton
                  icon="i-lucide-user-x"
                  size="xs"
                  color="error"
                  variant="ghost"
                  :loading="member.loadingRemove"
                  @click="handleRemove(member)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { api } from '@/services/api'
import { computed, ref, watch } from 'vue'

interface MemberApi {
  id: number
  user_id: string
  role: number
}

interface UserApi {
  id: string
  username: string
  display_name: string
}

interface MemberRow {
  userId: string
  name: string
  initials: string
  role: number
  loadingRole: boolean
  loadingRemove: boolean
}

const props = defineProps<{
  open: boolean
  conversationId: string
  currentUserId: string
  groupName: string
}>()

const emit = defineEmits<{
  close: []
  memberRemoved: [userId: string]
  groupRenamed: [name: string]
  left: []
  deleted: []
}>()

const loading = ref(false)
const members = ref<MemberRow[]>([])
const groupNameDraft = ref('')
const leavingGroup = ref(false)
const leaveError = ref('')
const deletingGroup = ref(false)

const isCurrentUserAdmin = computed(() =>
  members.value.find((m) => m.userId === props.currentUserId)?.role === 1
)

watch(() => props.groupName, (val) => { groupNameDraft.value = val }, { immediate: true })

async function fetchMembers() {
  if (!props.conversationId) return
  loading.value = true
  try {
    const res = await api.get<{ ok: boolean; data: MemberApi[] }>(`/api/groups/${props.conversationId}/members`)
    if (res.ok && res.data) {
      const rows = await Promise.all(
        res.data.map(async (m) => {
          let name = m.user_id.slice(0, 8)
          try {
            const user = await api.get<UserApi>(`/users/${m.user_id}`)
            name = user.display_name ?? user.username ?? name
          } catch { /* keep short id */ }
          return {
            userId: m.user_id,
            name,
            initials: name.slice(0, 2).toUpperCase(),
            role: m.role,
            loadingRole: false,
            loadingRemove: false,
          }
        })
      )
      members.value = rows
    }
  } finally {
    loading.value = false
  }
}

async function toggleRole(member: MemberRow) {
  member.loadingRole = true
  try {
    const newRole = member.role === 1 ? 0 : 1
    await api.patch(`/api/groups/${props.conversationId}/members/${member.userId}/role`, { role: newRole })
    member.role = newRole
  } catch { /* silent */ } finally {
    member.loadingRole = false
  }
}

async function handleDelete() {
  deletingGroup.value = true
  try {
    await api.delete(`/api/groups/${props.conversationId}`)
    emit('deleted')
    emit('close')
  } catch { /* silent */ } finally {
    deletingGroup.value = false
  }
}

async function handleLeave() {
  leavingGroup.value = true
  leaveError.value = ''
  try {
    await api.post(`/api/groups/${props.conversationId}/leave`, {})
    emit('left')
    emit('close')
  } catch {
    leaveError.value = 'Cannot leave: transfer admin rights to another member first.'
  } finally {
    leavingGroup.value = false
  }
}

async function handleRemove(member: MemberRow) {
  member.loadingRemove = true
  try {
    await api.delete(`/api/groups/${props.conversationId}/members/${member.userId}`)
    members.value = members.value.filter((m) => m.userId !== member.userId)
    emit('memberRemoved', member.userId)
  } catch { /* silent */ } finally {
    member.loadingRemove = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) fetchMembers()
  else members.value = []
})
</script>
