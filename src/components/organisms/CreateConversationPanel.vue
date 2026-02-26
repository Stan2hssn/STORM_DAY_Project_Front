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
        <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101b22] shadow-2xl">
          <header class="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p class="text-lg font-semibold text-[#e9edef]">
                New conversation
              </p>
              <p class="text-xs text-[#8696a0]">
                Search one user or multiple users, then create.
              </p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="handleClose" />
          </header>

          <div class="space-y-3 p-5">
            <UInput
              v-model="query"
              placeholder="Search users..."
              :ui="{ base: 'bg-[#172833] ring-white/10 text-[#d9dee0] placeholder:text-[#6f7c85]' }"
            />

            <UInput
              v-if="isGroup"
              v-model="groupName"
              placeholder="Group name (optional)"
              :ui="{ base: 'bg-[#172833] ring-white/10 text-[#d9dee0] placeholder:text-[#6f7c85]' }"
            />

            <div class="chat-scroll max-h-[340px] space-y-2 overflow-y-auto pr-1">
              <UserPickerItem
                v-for="user in filteredUsers"
                :key="user.id"
                :user="user"
                :selected="selectedIds.includes(user.id)"
                @toggle="toggleUser(user.id)"
              />
            </div>
          </div>

          <footer class="flex items-center justify-between border-t border-white/10 px-5 py-4">
            <p class="text-xs text-[#8696a0]">
              {{ selectedIds.length }} selected
            </p>
            <div class="flex items-center gap-2">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="handleClose" />
              <UButton
                label="Create"
                color="primary"
                :disabled="!canCreate"
                @click="handleCreate"
              />
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import UserPickerItem from '@/components/molecules/UserPickerItem.vue'
import type { CreateConversationPayload, DirectoryUser } from '@/types/chat'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  users: DirectoryUser[]
}>()

const emit = defineEmits<{
  close: []
  create: [payload: CreateConversationPayload]
}>()

const auth = useAuthStore()
const query = ref('')
const groupName = ref('')
const selectedIds = ref<string[]>([])
const searchResults = ref<DirectoryUser[]>([])

interface SearchUser {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

async function searchUsers(q: string) {
  if (!q.trim()) {
    searchResults.value = []
    return
  }
  try {
    const results = await api.get<SearchUser[]>(`/users/search?q=${encodeURIComponent(q)}`)
    searchResults.value = results
      .filter((u) => u.id !== auth.user?.id)
      .map((u) => ({
        id: u.id,
        name: u.display_name,
        handle: u.username,
        avatar: u.display_name.slice(0, 2).toUpperCase(),
        status: 'offline' as const,
      }))
  } catch {
    searchResults.value = []
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
watch(query, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => searchUsers(val), 300)
})

const filteredUsers = computed(() =>
  query.value.trim() ? searchResults.value : props.users
)

const isGroup = computed(() => selectedIds.value.length > 1)
const canCreate = computed(() => selectedIds.value.length > 0)

function resetState() {
  query.value = ''
  groupName.value = ''
  selectedIds.value = []
  searchResults.value = []
}

function toggleUser(userId: string) {
  if (selectedIds.value.includes(userId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== userId)
    return
  }
  selectedIds.value = [...selectedIds.value, userId]
}

function handleClose() {
  emit('close')
  resetState()
}

function handleCreate() {
  if (!canCreate.value) return
  emit('create', {
    participantIds: selectedIds.value,
    name: isGroup.value ? groupName.value.trim() : undefined
  })
  resetState()
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) resetState()
})
</script>
