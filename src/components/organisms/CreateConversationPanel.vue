<template>
  <Teleport to="body">
    <Transition name="modal-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
        :style="{ backgroundColor: 'var(--chat-modal-overlay)' }"
      >
        <Transition name="modal-panel" appear>
          <div
            class="w-full max-w-xl rounded-2xl border shadow-2xl"
            :style="{ backgroundColor: 'var(--chat-shell)', borderColor: 'var(--chat-border)' }"
          >
          <header class="flex items-center justify-between border-b px-5 py-4" :style="{ borderColor: 'var(--chat-border)' }">
            <div>
              <p class="text-lg font-semibold" :style="{ color: 'var(--chat-text)' }">
                New conversation
              </p>
              <p class="text-xs" :style="{ color: 'var(--chat-text-muted)' }">
                Search users, select one or more, then create.
              </p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="handleClose" />
          </header>

          <div class="space-y-3 p-5">
            <UInput
              v-model="query"
              placeholder="Search users..."
              :ui="{ base: 'ring-transparent' }"
              :style="{ backgroundColor: 'var(--chat-surface)', color: 'var(--chat-text)' }"
            />

            <UInput
              v-if="isGroup"
              v-model="groupName"
              placeholder="Group name (optional)"
              :ui="{ base: 'ring-transparent' }"
              :style="{ backgroundColor: 'var(--chat-surface)', color: 'var(--chat-text)' }"
            />

            <div class="chat-scroll max-h-[340px] space-y-2 overflow-y-auto pr-1">
              <p v-if="!query.trim()" class="py-6 text-center text-sm" :style="{ color: 'var(--chat-text-muted)' }">
                Type a name or username to search
              </p>

              <p v-else-if="searching" class="py-6 text-center text-sm" :style="{ color: 'var(--chat-text-muted)' }">
                Searching...
              </p>

              <p v-else-if="searchResults.length === 0" class="py-6 text-center text-sm" :style="{ color: 'var(--chat-text-muted)' }">
                No users found
              </p>

              <UserPickerItem
                v-for="user in searchResults"
                :key="user.id"
                :user="user"
                :selected="selectedUsers.has(user.id)"
                @toggle="toggleUser(user)"
              />
            </div>
          </div>

          <footer class="flex items-center justify-between border-t px-5 py-4" :style="{ borderColor: 'var(--chat-border)' }">
            <p class="text-xs" :style="{ color: 'var(--chat-text-muted)' }">
              {{ selectedUsers.size }} selected
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
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import UserPickerItem from '@/components/molecules/UserPickerItem.vue'
import type { ChatUser, CreateGroupPayload, UserSearchDto } from '@/types/chat'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [payload: CreateGroupPayload]
}>()

const auth = useAuthStore()
const query = ref('')
const groupName = ref('')
const selectedUsers = ref<Map<string, ChatUser>>(new Map())
const searchResults = ref<ChatUser[]>([])
const searching = ref(false)

async function searchUsers(q: string) {
  if (!q.trim()) {
    searchResults.value = []
    return
  }

  searching.value = true
  try {
    const results = await api.get<UserSearchDto[]>(
      `/users/search?q=${encodeURIComponent(q)}`,
    )
    searchResults.value = results
      .filter((u) => u.id !== auth.user?.id)
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
      }))
  } catch {
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
watch(query, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => searchUsers(val), 300)
})

const isGroup = computed(() => selectedUsers.value.size > 1)
const canCreate = computed(() => selectedUsers.value.size > 0)

function resetState() {
  query.value = ''
  groupName.value = ''
  selectedUsers.value = new Map()
  searchResults.value = []
  searching.value = false
}

function toggleUser(user: ChatUser) {
  const next = new Map(selectedUsers.value)
  if (next.has(user.id)) {
    next.delete(user.id)
  } else {
    next.set(user.id, user)
  }
  selectedUsers.value = next
}

function handleClose() {
  emit('close')
  resetState()
}

function handleCreate() {
  if (!canCreate.value) return

  const users = [...selectedUsers.value.values()]

  // Server generates the display name from members automatically.
  // Only send a custom name if the user explicitly typed one for a group.
  emit('create', {
    name: isGroup.value ? groupName.value.trim() : '',
    memberIds: users.map((u) => u.id),
  })
  resetState()
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) resetState()
})
</script>

<style scoped>
.modal-overlay-enter-active { transition: opacity 0.25s ease-out; }
.modal-overlay-leave-active { transition: opacity 0.2s ease-in; }
.modal-overlay-enter-from,
.modal-overlay-leave-to { opacity: 0; }

.modal-panel-enter-active {
  transition:
    opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-panel-leave-active {
  transition:
    opacity 0.2s ease-in,
    transform 0.2s ease-in;
}
.modal-panel-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}
.modal-panel-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
