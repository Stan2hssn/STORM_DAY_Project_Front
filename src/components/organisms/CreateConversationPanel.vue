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
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  users: DirectoryUser[]
}>()

const emit = defineEmits<{
  close: []
  create: [payload: CreateConversationPayload]
}>()

const query = ref('')
const groupName = ref('')
const selectedIds = ref<string[]>([])

const filteredUsers = computed(() => {
  const search = query.value.trim().toLowerCase()

  if (!search) {
    return props.users
  }

  return props.users.filter((user) => {
    return user.name.toLowerCase().includes(search) || user.handle.toLowerCase().includes(search)
  })
})

const isGroup = computed(() => selectedIds.value.length > 1)
const canCreate = computed(() => selectedIds.value.length > 0)

function resetState() {
  query.value = ''
  groupName.value = ''
  selectedIds.value = []
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
  if (!canCreate.value) {
    return
  }

  emit('create', {
    participantIds: selectedIds.value,
    name: isGroup.value ? groupName.value.trim() : undefined
  })
  resetState()
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    resetState()
  }
})
</script>